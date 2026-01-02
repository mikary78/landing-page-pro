/**
 * Update Project Stage Azure Function
 * Updates a project stage (feedback, status, etc.)
 * 
 * 참고: ProjectDetail.tsx에서 사용
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query } from '../lib/database';

interface UpdateStageRequest {
  feedback?: string;
  status?: string;
}

export async function updateProjectStage(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Authenticate
    const user = await requireAuth(request, context);
    context.log(`[UpdateProjectStage] User: ${user.userId}`);

    // Get stageId from URL params
    const stageId = request.params.stageId;
    if (!stageId) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Stage ID is required',
        },
      };
    }

    // Parse request body
    const body = await request.json() as UpdateStageRequest;
    const { feedback, status } = body;

    // Verify stage ownership through project
    const stageCheck = await query(
      `SELECT ps.id, ps.project_id 
       FROM project_stages ps
       JOIN projects p ON ps.project_id = p.id
       WHERE ps.id = $1 AND p.user_id = $2`,
      [stageId, user.userId]
    );

    if (stageCheck.length === 0) {
      return {
        status: 404,
        jsonBody: {
          success: false,
          error: 'Stage not found or access denied',
        },
      };
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (feedback !== undefined) {
      updates.push(`feedback = $${paramIndex++}`);
      values.push(feedback);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (updates.length === 0) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'No fields to update',
        },
      };
    }

    updates.push(`updated_at = NOW()`);
    values.push(stageId);

    const result = await query(
      `UPDATE project_stages 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return {
      status: 200,
      jsonBody: {
        success: true,
        stage: result[0],
      },
    };
  } catch (error) {
    context.error('[UpdateProjectStage] Error:', error);
    
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

app.http('updateProjectStage', {
  methods: ['PUT', 'PATCH'],
  authLevel: 'anonymous',
  route: 'updateprojectstage/{stageId}',
  handler: updateProjectStage,
});

