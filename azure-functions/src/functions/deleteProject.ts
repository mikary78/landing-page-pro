/**
 * Delete Project Azure Function
 * Deletes a project for the authenticated user
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query } from '../lib/database';

export async function deleteProject(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Authenticate
    const user = await requireAuth(request, context);
    context.log(`[DeleteProject] User: ${user.userId}`);

    // Get project ID from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const projectId = pathParts[pathParts.length - 1];

    if (!projectId) {
      return {
        status: 400,
        jsonBody: { success: false, error: 'Project ID is required' },
      };
    }

    // Verify project belongs to user
    const projects = await query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, user.userId]
    );

    if (projects.length === 0) {
      return {
        status: 404,
        jsonBody: { success: false, error: 'Project not found' },
      };
    }

    // Delete project (CASCADE will handle related records)
    await query('DELETE FROM projects WHERE id = $1 AND user_id = $2', [
      projectId,
      user.userId,
    ]);

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: 'Project deleted successfully',
      },
    };
  } catch (error) {
    context.error('[DeleteProject] Error:', error);
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

app.http('deleteProject', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'deleteproject/{projectId}',
  handler: deleteProject,
});

