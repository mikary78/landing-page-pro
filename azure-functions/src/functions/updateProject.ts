/**
 * Update Project Azure Function
 * Updates project properties (status, ai_model, etc.)
 * 
 * 참고: ProjectDetail.tsx에서 사용
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query } from '../lib/database';

interface UpdateProjectRequest {
  title?: string;
  description?: string;
  status?: string;
  ai_model?: string;
}

export async function updateProject(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Authenticate
    const user = await requireAuth(request, context);
    context.log(`[UpdateProject] User: ${user.userId}`);

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

    // Parse request body
    const body = await request.json() as UpdateProjectRequest;
    const { title, description, status, ai_model } = body;

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

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (ai_model !== undefined) {
      updates.push(`ai_model = $${paramIndex++}`);
      values.push(ai_model);
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
    values.push(projectId);

    const result = await query(
      `UPDATE projects 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return {
      status: 200,
      jsonBody: {
        success: true,
        project: result[0],
      },
    };
  } catch (error) {
    context.error('[UpdateProject] Error:', error);
    
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

app.http('updateProject', {
  methods: ['PUT', 'PATCH'],
  authLevel: 'anonymous',
  route: 'updateproject/{projectId}',
  handler: updateProject,
});

