/**
 * Start Generation Job (Agent Orchestration)
 *
 * - HTTP로 Job 생성 요청을 받고
 * - DB에 generation_jobs / generation_steps / generation_artifacts 초안 생성
 * - Queue로 jobId를 enqueue 하여 worker가 단계별 실행
 *
 * 참고자료(외부):
 * - Azure Functions Node.js v4 Storage Queue trigger/output 바인딩 예제:
 *   https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-queue-trigger
 *   https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-queue-output
 */

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
  output,
} from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query, transaction } from '../lib/database';
import { planGenerationSteps, RequestedOutputs, GenerationOptions } from '../lib/agent/plan';
import { isUuid } from '../lib/validation';

const jobQueueOutput = output.storageQueue({
  queueName: 'generation-jobs',
  connection: 'AzureWebJobsStorage',
});

export interface StartGenerationJobRequest {
  projectId: string;
  documentContent: string;
  aiModel: 'gemini' | 'claude' | 'chatgpt';
  outputs: RequestedOutputs;
  options?: GenerationOptions;
}

export async function startGenerationJob(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const user = await requireAuth(request, context);
    const body = (await request.json()) as StartGenerationJobRequest;

    const { projectId, documentContent, aiModel, outputs, options } = body;
    if (!projectId || !documentContent?.trim() || !aiModel) {
      return { status: 400, jsonBody: { success: false, error: 'Missing required fields' } };
    }

        if (!isUuid(projectId)) {
          return { status: 400, jsonBody: { success: false, error: 'Invalid projectId (UUID required)' } };
        }

    if (!outputs?.document && !outputs?.infographic && !outputs?.slides) {
      return { status: 400, jsonBody: { success: false, error: 'At least one output must be selected' } };
    }

    // 프로젝트 소유권 확인
    const projectRows = await query(`SELECT id FROM projects WHERE id = $1 AND user_id = $2`, [
      projectId,
      user.userId,
    ]);
    if (projectRows.length === 0) {
      return { status: 404, jsonBody: { success: false, error: 'Project not found or access denied' } };
    }

    // 프로필 존재 보장(기존 함수들과 동일)
    await query(
      `INSERT INTO profiles (user_id, display_name, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [user.userId, user.name || user.email || 'Unknown User']
    );

    const effectiveOptions: GenerationOptions = {
      enableWebSearch: !!options?.enableWebSearch,
      enableImageGeneration: !!options?.enableImageGeneration,
    };

    const stepsPlan = planGenerationSteps(outputs, effectiveOptions);

    const job = await transaction(async (client) => {
      const jobRes = await client.query(
        `INSERT INTO generation_jobs (project_id, user_id, ai_model, requested_outputs, options, status, current_step_index)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, 'queued', 0)
         RETURNING *`,
        [projectId, user.userId, aiModel, JSON.stringify(outputs), JSON.stringify(effectiveOptions)]
      );
      const jobRow = jobRes.rows[0];

      // 단계 생성
      for (let i = 0; i < stepsPlan.length; i++) {
        const s = stepsPlan[i];
        await client.query(
          `INSERT INTO generation_steps (job_id, step_type, title, status, order_index, input)
           VALUES ($1, $2, $3, 'pending', $4, $5::jsonb)`,
          [
            jobRow.id,
            s.stepType,
            s.title,
            i,
            JSON.stringify(
              s.stepType === 'interpret'
                ? { projectId, documentContent }
                : { projectId }
            ),
          ]
        );
      }

      // 산출물 슬롯 생성(선택된 것만)
      const artifactTypes: Array<'document' | 'infographic' | 'slides'> = [];
      if (outputs.document) artifactTypes.push('document');
      if (outputs.infographic) artifactTypes.push('infographic');
      if (outputs.slides) artifactTypes.push('slides');

      for (const t of artifactTypes) {
        await client.query(
          `INSERT INTO generation_artifacts (job_id, artifact_type, status)
           VALUES ($1, $2, 'draft')
           ON CONFLICT (job_id, artifact_type) DO NOTHING`,
          [jobRow.id, t]
        );
      }

      // projects.status도 processing으로 업데이트(기존 UI 호환)
      await client.query(`UPDATE projects SET status = 'processing', updated_at = NOW() WHERE id = $1`, [
        projectId,
      ]);

      return jobRow;
    });

    // 큐에 메시지 enqueue (worker가 실행)
    context.extraOutputs.set(jobQueueOutput, JSON.stringify({ jobId: job.id }));

    return {
      status: 200,
      jsonBody: {
        success: true,
        jobId: job.id,
      },
    };
  } catch (error) {
    context.error('[StartGenerationJob] Error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { status: 401, jsonBody: { success: false, error: 'Unauthorized' } };
    }
    return {
      status: 500,
      jsonBody: { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

app.http('startGenerationJob', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'generation/start',
  extraOutputs: [jobQueueOutput],
  handler: startGenerationJob,
});

