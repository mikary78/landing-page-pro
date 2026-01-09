/**
 * Generation Chat (Studio)
 *
 * 목적:
 * - 스튜디오 좌측 패널에서 사용자와 AI가 대화하면서 산출물 수정/중단을 요청할 수 있게 합니다.
 *
 * 구현 전략(최소 기능):
 * - 채팅 메시지는 DB에 영속 저장하지 않고(스키마 변경 최소화), 프론트에서 상태로 유지합니다.
 * - 사용자가 "강의안/슬라이드/인포그래픽 수정" 요청 시:
 *   - generation_steps에 revise_* step을 동적으로 추가(pending)
 *   - job을 processing으로 돌리고 큐에 재-enqueue하여 worker가 수정 step을 실행하게 합니다.
 * - 사용자가 "중단" 요청 시:
 *   - 별도 cancel endpoint 사용을 권장하되, 여기서도 키워드로 cancel을 처리할 수 있습니다.
 *
 * 참고자료(외부):
 * - Azure Functions HTTP trigger (Node.js v4):
 *   https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node?tabs=v4
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { transaction } from '../lib/database';
import { generateContent } from '../lib/ai-services';
import { isUuid } from '../lib/validation';

const jobQueueOutput = output.storageQueue({
  queueName: 'generation-jobs',
  connection: 'AzureWebJobsStorage',
});

type Target = 'document' | 'infographic' | 'slides';
type ChatIntent = 'revise' | 'cancel' | 'question';

interface GenerationChatRequest {
  projectId: string;
  message: string;
  // optional explicit targets from UI (checkboxes / selected tab)
  targets?: Partial<Record<Target, boolean>>;
  // optional hint for AI model
  aiModel?: 'gemini' | 'claude' | 'chatgpt';
}

function keywordIntent(message: string): ChatIntent {
  const m = message.toLowerCase();
  if (/(중단|취소|그만|멈춰|stop|cancel)/i.test(m)) return 'cancel';
  if (/(수정|고쳐|바꿔|추가|삭제|반영|revise|edit|update)/i.test(m)) return 'revise';
  return 'question';
}

function detectTargets(message: string): Target[] {
  const targets: Target[] = [];
  if (/(강의안|문서|document)/i.test(message)) targets.push('document');
  if (/(인포그래픽|infographic)/i.test(message)) targets.push('infographic');
  if (/(슬라이드|교안|slides|deck)/i.test(message)) targets.push('slides');
  return Array.from(new Set(targets));
}

export async function generationChat(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const user = await requireAuth(request, context);
    const body = (await request.json()) as GenerationChatRequest;
    const { projectId, message, targets: explicitTargets, aiModel } = body;

    if (!projectId || !message?.trim()) {
      return { status: 400, jsonBody: { success: false, error: 'Missing required fields' } };
    }
    if (!isUuid(projectId)) {
      return { status: 400, jsonBody: { success: false, error: 'Invalid projectId (UUID required)' } };
    }

    const intent = keywordIntent(message);

    // If intent is ambiguous revise, we can ask the model to summarize instruction succinctly.
    const effectiveModel: 'gemini' | 'claude' | 'chatgpt' = aiModel || 'chatgpt';

    const result = await transaction(async (client) => {
      // Ensure project ownership
      const projectCheck = await client.query(`SELECT id FROM projects WHERE id = $1 AND user_id = $2`, [
        projectId,
        user.userId,
      ]);
      if (projectCheck.rows.length === 0) {
        return { ok: false as const, status: 404 as const, error: 'Project not found or access denied' };
      }

      const jobRes = await client.query(
        `SELECT * FROM generation_jobs WHERE project_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
        [projectId, user.userId]
      );

      if (jobRes.rows.length === 0) {
        return { ok: false as const, status: 404 as const, error: 'No generation job found for this project' };
      }

      const job = jobRes.rows[0];

      if (intent === 'cancel') {
        await client.query(
          `UPDATE generation_jobs SET status='cancelled', error=COALESCE($2, error), updated_at=NOW() WHERE id=$1`,
          [job.id, 'Cancelled via chat']
        );
        await client.query(
          `UPDATE generation_steps SET status='cancelled', error=COALESCE(error, 'Cancelled by user'), updated_at=NOW()
           WHERE job_id=$1 AND status IN ('pending')`,
          [job.id]
        );
        await client.query(`UPDATE projects SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, [projectId]);

        return {
          ok: true as const,
          action: { type: 'cancelled' as const, jobId: job.id },
          assistantMessage: '요청하신 작업 중단을 처리했습니다. (Job cancelled)',
          enqueue: false,
        };
      }

      // Revise: decide target(s)
      const picked: Target[] = [];
      if (explicitTargets) {
        if (explicitTargets.document) picked.push('document');
        if (explicitTargets.infographic) picked.push('infographic');
        if (explicitTargets.slides) picked.push('slides');
      }
      const inferred = detectTargets(message);
      const targets = (picked.length ? picked : inferred).length ? (picked.length ? picked : inferred) : (['document'] as Target[]);

      // Summarize instruction to a clean, worker-friendly form
      const system = `당신은 교육 콘텐츠 편집 에이전트입니다. 사용자의 요청을 한 줄 "편집 지시문"으로 요약하세요. 한국어로, 불필요한 설명 없이 지시문만 출력하세요.`;
      const summarized = await generateContent(
        effectiveModel,
        `사용자 요청:\n${message}\n\n출력: 편집 지시문(한 줄)`,
        system
      );
      const instruction = (summarized || message).trim();

      const maxRes = await client.query(`SELECT COALESCE(MAX(order_index), -1) AS max FROM generation_steps WHERE job_id=$1`, [
        job.id,
      ]);
      let order = Number(maxRes.rows[0]?.max ?? -1) + 1;

      const addedSteps: Array<{ stepType: string; orderIndex: number }> = [];

      for (const t of targets) {
        const stepType =
          t === 'document' ? 'revise_document' : t === 'infographic' ? 'revise_infographic' : 'revise_slides';
        const title =
          t === 'document' ? '강의안(문서) 수정' : t === 'infographic' ? '인포그래픽 수정' : '교안 슬라이드 수정';

        await client.query(
          `INSERT INTO generation_steps (job_id, step_type, title, status, order_index, input)
           VALUES ($1, $2, $3, 'pending', $4, $5::jsonb)`,
          [job.id, stepType, title, order, JSON.stringify({ projectId, instruction, target: t })]
        );
        addedSteps.push({ stepType, orderIndex: order });
        order += 1;

        // Ensure artifact slot exists
        await client.query(
          `INSERT INTO generation_artifacts (job_id, artifact_type, status)
           VALUES ($1, $2, 'draft')
           ON CONFLICT (job_id, artifact_type) DO NOTHING`,
          [job.id, t]
        );
      }

      // set job to processing and enqueue
      await client.query(`UPDATE generation_jobs SET status='processing', updated_at=NOW() WHERE id=$1`, [job.id]);
      await client.query(`UPDATE projects SET status='processing', updated_at=NOW() WHERE id=$1`, [projectId]);

      return {
        ok: true as const,
        action: { type: 'queued_revisions' as const, jobId: job.id, targets, stepsAdded: addedSteps },
        assistantMessage: `좋아요. 요청하신 내용을 반영해서 ${targets.join(', ')} 산출물을 수정하겠습니다.`,
        enqueue: true,
        jobId: job.id as string,
      };
    });

    if (!result.ok) {
      return { status: result.status, jsonBody: { success: false, error: result.error } };
    }

    if (result.enqueue && result.jobId) {
      context.extraOutputs.set(jobQueueOutput, JSON.stringify({ jobId: result.jobId }));
    }

    return { status: 200, jsonBody: { success: true, ...result } };
  } catch (error) {
    context.error('[GenerationChat] Error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { status: 401, jsonBody: { success: false, error: 'Unauthorized' } };
    }
    return { status: 500, jsonBody: { success: false, error: error instanceof Error ? error.message : 'Unknown error' } };
  }
}

app.http('generationChat', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'generation/chat',
  extraOutputs: [jobQueueOutput],
  handler: generationChat,
});

