/**
 * Get Project Stages Azure Function
 * Returns project stages for a specific AI model
 * 
 * 참고: LessonDetailPane.tsx, ProjectDetail.tsx에서 사용
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query } from '../lib/database';

interface ProjectStage {
  id: string;
  project_id: string;
  ai_model: string;
  stage_order: number;
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

    // Build query based on whether aiModel is specified
    let stages: ProjectStage[];
    if (aiModel) {
      // 먼저 ai_model 컬럼이 있는지 확인하고, 없으면 모든 stages 반환
      try {
        // 대소문자 구분 없이 비교
        stages = await query<ProjectStage>(
          `SELECT * FROM project_stages 
           WHERE project_id = $1 AND LOWER(ai_model) = LOWER($2)
           ORDER BY stage_order ASC`,
          [projectId, aiModel]
        );
        
        context.log(`[GetProjectStages] Found ${stages.length} stages for project ${projectId} with ai_model = '${aiModel}'`);
        
        // ai_model로 필터링했을 때 결과가 없으면, ai_model이 NULL이거나 다른 값인 stages도 확인
        if (stages.length === 0) {
          context.log(`[GetProjectStages] No stages found with ai_model = '${aiModel}', checking all stages for project ${projectId}`);
          const allStages = await query<ProjectStage>(
            `SELECT * FROM project_stages 
             WHERE project_id = $1
             ORDER BY stage_order ASC`,
            [projectId]
          );
          
          context.log(`[GetProjectStages] Total stages for project ${projectId}: ${allStages.length}`);
          if (allStages.length > 0) {
            const aiModels = [...new Set(allStages.map(s => s.ai_model || 'NULL'))];
            context.log(`[GetProjectStages] Available ai_model values: ${aiModels.join(', ')}`);
          }
        }
      } catch (error) {
        // ai_model 컬럼이 없을 수 있으므로, 모든 stages 반환
        context.warn(`[GetProjectStages] Error filtering by ai_model, getting all stages:`, error);
        stages = await query<ProjectStage>(
          `SELECT * FROM project_stages 
           WHERE project_id = $1
           ORDER BY stage_order ASC`,
          [projectId]
        );
      }
    } else {
      // aiModel 파라미터가 없으면 모든 stages 반환
      stages = await query<ProjectStage>(
        `SELECT * FROM project_stages 
         WHERE project_id = $1
         ORDER BY ai_model, stage_order ASC`,
        [projectId]
      );
      
      context.log(`[GetProjectStages] Found ${stages.length} total stages for project ${projectId} (no aiModel filter)`);
      if (stages.length > 0) {
        const aiModels = [...new Set(stages.map(s => s.ai_model || 'NULL'))];
        context.log(`[GetProjectStages] Available ai_model values (all stages): ${aiModels.join(', ')}`);
        
        // 각 ai_model별 개수 로그
        const modelCounts = stages.reduce((acc, s) => {
          const model = s.ai_model || 'NULL';
          acc[model] = (acc[model] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        context.log(`[GetProjectStages] Stage count by model:`, JSON.stringify(modelCounts));
      }
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

