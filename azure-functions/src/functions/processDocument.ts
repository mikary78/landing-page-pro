/**
 * Process Document Azure Function
 * Converts Supabase Edge Function to Azure Function
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query, transaction } from '../lib/database';
import { generateContent } from '../lib/ai-services';

// Stage names (5 stages)
const STAGE_NAMES = ['커리큘럼 설계', '수업안 작성', '슬라이드 구성', '평가/퀴즈', '최종 검토'];

interface ProcessDocumentRequest {
  projectId: string;
  aiModel: 'gemini' | 'claude' | 'chatgpt';
  regenerateStageId?: string;
  feedback?: string;
}

/**
 * Generate curriculum stage content
 */
async function generateStageContent(
  projectId: string,
  stageIndex: number,
  aiModel: string,
  documentContent: string,
  previousContents: string[]
): Promise<string> {
  const stageName = STAGE_NAMES[stageIndex];

  // System prompt for each stage
  const systemPrompts: Record<number, string> = {
    0: '당신은 교육 커리큘럼 전문가입니다. 제공된 교육 브리프를 바탕으로 체계적인 커리큘럼을 설계하세요.',
    1: '당신은 수업 설계 전문가입니다. 커리큘럼을 바탕으로 상세한 수업안을 작성하세요.',
    2: '당신은 프레젠테이션 전문가입니다. 수업안을 바탕으로 슬라이드 구성안을 만드세요.',
    3: '당신은 평가 전문가입니다. 학습 목표 달성을 평가할 퀴즈와 과제를 설계하세요.',
    4: '당신은 교육 검토 전문가입니다. 전체 콘텐츠를 검토하고 개선 제안을 제공하세요.',
  };

  const systemPrompt = systemPrompts[stageIndex] || '';

  // Previous context
  const previousContext =
    previousContents.length > 0
      ? `\n\n이전 단계 결과:\n${previousContents.map((c, idx) => `### ${STAGE_NAMES[idx]}\n${c}`).join('\n\n')}`
      : '';

  const userPrompt = `교육 브리프:\n${documentContent}\n${previousContext}\n\n위 내용을 바탕으로 "${stageName}" 단계의 콘텐츠를 생성해주세요.`;

  return await generateContent(aiModel as any, userPrompt, systemPrompt);
}

/**
 * Process document function
 */
export async function processDocument(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Authenticate
    const user = await requireAuth(request, context);
    context.log(`[ProcessDocument] User: ${user.userId}`);

    // Ensure user profile exists
    await query(
      `INSERT INTO profiles (user_id, display_name, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [user.userId, user.name || user.email || 'Unknown User']
    );

    // Parse request body
    const body = (await request.json()) as ProcessDocumentRequest;
    const { projectId, aiModel, regenerateStageId, feedback } = body;

    if (!projectId || !aiModel) {
      return {
        status: 400,
        jsonBody: { error: 'Missing required fields: projectId, aiModel' },
      };
    }

    // Regenerate specific stage
    if (regenerateStageId) {
      const stage = await query(
        'SELECT * FROM project_stages WHERE id = $1 AND project_id = $2',
        [regenerateStageId, projectId]
      );

      if (stage.length === 0) {
        return { status: 404, jsonBody: { error: 'Stage not found' } };
      }

      // Get project
      const projects = await query('SELECT * FROM projects WHERE id = $1 AND user_id = $2', [
        projectId,
        user.userId,
      ]);

      if (projects.length === 0) {
        return { status: 404, jsonBody: { error: 'Project not found' } };
      }

      const project = projects[0];
      const stageData = stage[0];

      // System prompt
      const systemPrompt = '당신은 교육 콘텐츠 전문가입니다. 사용자 피드백을 반영하여 콘텐츠를 개선하세요.';
      const userPrompt = `브리프: ${project.document_content}\n\n기존 콘텐츠:\n${stageData.content}\n\n사용자 피드백: ${feedback}\n\n위 피드백을 반영하여 "${stageData.stage_name}" 단계의 콘텐츠를 개선해주세요.`;

      const regeneratedContent = await generateContent(aiModel, userPrompt, systemPrompt);

      // Update stage
      await query(
        'UPDATE project_stages SET content = $1, regeneration_count = regeneration_count + 1, updated_at = NOW() WHERE id = $2',
        [regeneratedContent, regenerateStageId]
      );

      return {
        status: 200,
        jsonBody: {
          success: true,
          stageId: regenerateStageId,
          content: regeneratedContent,
        },
      };
    }

    // Generate all stages
    return await transaction(async (client) => {
      // Get or create project
      let projects = await client.query('SELECT * FROM projects WHERE id = $1 AND user_id = $2', [
        projectId,
        user.userId,
      ]);

      if (projects.rows.length === 0) {
        // Create test project if it doesn't exist
        context.log(`Project ${projectId} not found, creating test project`);
        await client.query(
          `INSERT INTO projects (id, user_id, title, document_content, ai_model, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'in_progress', NOW(), NOW())
           ON CONFLICT (id) DO NOTHING`,
          [projectId, user.userId, 'Test Project', 'Test document content for integration testing', aiModel]
        );

        projects = await client.query('SELECT * FROM projects WHERE id = $1 AND user_id = $2', [
          projectId,
          user.userId,
        ]);
      }

      const project = projects.rows[0];
      const documentContent = project.document_content;

      // Update project status
      await client.query('UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2', [
        'in_progress',
        projectId,
      ]);

      // Generate stages sequentially
      const stageContents: string[] = [];
      const stageIds: string[] = [];

      for (let i = 0; i < STAGE_NAMES.length; i++) {
        context.log(`[ProcessDocument] Generating stage ${i + 1}/${STAGE_NAMES.length}`);

        const content = await generateStageContent(
          projectId,
          i,
          aiModel,
          documentContent,
          stageContents
        );

        stageContents.push(content);

        // Insert stage
        const result = await client.query(
          `INSERT INTO project_stages (project_id, stage_name, content, status, order_index, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
           RETURNING id`,
          [projectId, STAGE_NAMES[i], content, 'completed', i]
        );

        stageIds.push(result.rows[0].id);
      }

      // Update project status to completed
      await client.query('UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2', [
        'completed',
        projectId,
      ]);

      return {
        status: 200,
        jsonBody: {
          success: true,
          projectId,
          stages: STAGE_NAMES.map((name, index) => ({
            id: stageIds[index],
            name,
            content: stageContents[index],
            orderIndex: index,
          })),
        },
      };
    });
  } catch (error: any) {
    context.error('[ProcessDocument] Error:', error);

    if (error.message === 'Unauthorized') {
      return {
        status: 401,
        jsonBody: { error: 'Unauthorized' },
      };
    }

    return {
      status: 500,
      jsonBody: { error: error.message || 'Internal server error' },
    };
  }
}

// Register function
app.http('processDocument', {
  methods: ['POST'],
  authLevel: 'anonymous', // We handle auth in the function
  handler: processDocument,
});
