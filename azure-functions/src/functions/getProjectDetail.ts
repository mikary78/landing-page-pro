/**
 * Get Project Detail Azure Function
 * Returns project with AI results and stages
 * 
 * 참고: ProjectDetail.tsx에서 사용
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query } from '../lib/database';

export async function getProjectDetail(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Authenticate
    const user = await requireAuth(request, context);
    context.log(`[GetProjectDetail] User: ${user.userId}`);

    // Get projectId from URL params
    const projectId = request.params.projectId;
    if (!projectId) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Project ID is required',
        },
      };
    }

    // Get project with ownership check
    const projects = await query(
      `SELECT * FROM projects WHERE id = $1 AND user_id = $2`,
      [projectId, user.userId]
    );

    if (projects.length === 0) {
      return {
        status: 404,
        jsonBody: {
          success: false,
          error: 'Project not found or access denied',
        },
      };
    }

    const project = projects[0];
    
    // Default ai_model if not set
    const aiModel = project.ai_model || 'gemini';

    // Get AI results
    const aiResults = await query(
      `SELECT * FROM project_ai_results 
       WHERE project_id = $1 
       ORDER BY created_at DESC`,
      [projectId]
    );

    // Get stages for the project (ai_model 필터 또는 전체)
    let stages;
    try {
      // 먼저 ai_model로 필터링 시도
      stages = await query(
        `SELECT * FROM project_stages 
         WHERE project_id = $1 AND ai_model = $2
         ORDER BY COALESCE(stage_order, order_index) ASC`,
        [projectId, aiModel]
      );
      
      // ai_model 필터로 결과가 없으면, 전체 stages 조회
      if (stages.length === 0) {
        stages = await query(
          `SELECT * FROM project_stages 
           WHERE project_id = $1
           ORDER BY COALESCE(stage_order, order_index) ASC`,
          [projectId]
        );
      }
    } catch (stageError) {
      // 컬럼이 없는 경우 기본 쿼리 사용
      context.warn('[GetProjectDetail] ai_model filter failed, getting all stages:', stageError);
      stages = await query(
        `SELECT * FROM project_stages 
         WHERE project_id = $1
         ORDER BY order_index ASC`,
        [projectId]
      );
    }

    return {
      status: 200,
      jsonBody: {
        success: true,
        project,
        aiResults: aiResults || [],
        stages: stages || [],
      },
    };
  } catch (error) {
    context.error('[GetProjectDetail] Error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return {
        status: 401,
        jsonBody: {
          success: false,
          error: 'Unauthorized',
        },
      };
    }
    
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

app.http('getProjectDetail', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'getproject/{projectId}',
  handler: getProjectDetail,
});

