/**
 * Get Project Detail Azure Function
 * Returns project with AI results and stages
 * 
 * 참고: ProjectDetail.tsx에서 사용
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query } from '../lib/database';
import { isUuid } from '../lib/validation';
import { getProjectStagesSchema } from '../lib/schemaCache';

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

    if (!isUuid(projectId)) {
      return { status: 400, jsonBody: { success: false, error: 'Invalid projectId (UUID required)' } };
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

    // Get stages for the project (스키마에 따라 안전한 쿼리만 실행)
    const schema = await getProjectStagesSchema();
    const orderClause = schema.hasStageOrder ? 'ORDER BY stage_order ASC' : 'ORDER BY order_index ASC';

    let stages: any[] = [];
    if (schema.hasAiModel) {
      stages = await query(
        `SELECT * FROM project_stages WHERE project_id = $1 AND ai_model = $2 ${orderClause}`,
        [projectId, aiModel]
      );
    }
    if (!stages || stages.length === 0) {
      stages = await query(
        `SELECT * FROM project_stages WHERE project_id = $1 ${orderClause}`,
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

