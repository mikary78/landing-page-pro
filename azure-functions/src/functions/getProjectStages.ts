/**
 * Get Project Stages Azure Function
 * Returns project stages for a specific AI model
 * 
 * 참고: LessonDetailPane.tsx, ProjectDetail.tsx에서 사용
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query } from '../lib/database';
import { isUuid } from '../lib/validation';
import { getProjectStagesSchema } from '../lib/schemaCache';

interface ProjectStage {
  id: string;
  project_id: string;
  ai_model?: string;
  stage_order?: number;
  content?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function getProjectStages(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Authenticate
    const user = await requireAuth(request, context);
    context.log(`[GetProjectStages] User: ${user.userId}`);

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

    // Get aiModel from query params (optional)
    const aiModel = request.query.get('aiModel');

    // Verify project ownership
    const projectCheck = await query(
      `SELECT id FROM projects WHERE id = $1 AND user_id = $2`,
      [projectId, user.userId]
    );

    if (projectCheck.length === 0) {
      return {
        status: 404,
        jsonBody: {
          success: false,
          error: 'Project not found or access denied',
        },
      };
    }

    const schema = await getProjectStagesSchema();

    // Build query based on whether aiModel is specified (단, 스키마가 있을 때만)
    let stages: ProjectStage[];
    const orderClause = schema.hasStageOrder ? 'ORDER BY stage_order ASC' : 'ORDER BY order_index ASC';

    if (aiModel && schema.hasAiModel) {
      stages = await query<ProjectStage>(
        `SELECT * FROM project_stages WHERE project_id = $1 AND LOWER(ai_model) = LOWER($2) ${orderClause}`,
        [projectId, aiModel]
      );

      // 필터 결과가 없으면 전체 반환(기존 동작 유지)
      if (stages.length === 0) {
        stages = await query<ProjectStage>(
          `SELECT * FROM project_stages WHERE project_id = $1 ${orderClause}`,
          [projectId]
        );
      }
    } else {
      // 스키마가 없거나 aiModel 파라미터가 없으면 전체 반환
      stages = await query<ProjectStage>(
        `SELECT * FROM project_stages WHERE project_id = $1 ${orderClause}`,
        [projectId]
      );
    }

    return {
      status: 200,
      jsonBody: {
        success: true,
        stages,
      },
    };
  } catch (error) {
    context.error('[GetProjectStages] Error:', error);
    
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

app.http('getProjectStages', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'getprojectstages/{projectId}',
  handler: getProjectStages,
});

