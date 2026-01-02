/**
 * Deployment API Azure Functions
 * Manages course deployments
 * 
 * 참고: CourseDeployment.tsx에서 사용
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query } from '../lib/database';

// Get deployment
export async function getDeployment(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const user = await requireAuth(request, context);
    const projectId = request.params.projectId;

    if (!projectId) {
      return { status: 400, jsonBody: { success: false, error: 'Project ID is required' } };
    }

    const deployments = await query(
      `SELECT * FROM course_deployments
       WHERE project_id = $1 AND user_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [projectId, user.userId]
    );

    return {
      status: 200,
      jsonBody: {
        success: true,
        deployment: deployments[0] || null,
      },
    };
  } catch (error) {
    context.error('[GetDeployment] Error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { status: 401, jsonBody: { success: false, error: 'Unauthorized' } };
    }
    return { status: 500, jsonBody: { success: false, error: error instanceof Error ? error.message : 'Unknown error' } };
  }
}

// Create deployment
export async function createDeployment(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const user = await requireAuth(request, context);
    const body = await request.json() as { projectId: string; deploymentUrl: string };
    const { projectId, deploymentUrl } = body;

    if (!projectId || !deploymentUrl) {
      return { status: 400, jsonBody: { success: false, error: 'Project ID and deployment URL are required' } };
    }

    // Get current version
    const existing = await query(
      `SELECT version FROM course_deployments
       WHERE project_id = $1
       ORDER BY version DESC
       LIMIT 1`,
      [projectId]
    );

    const newVersion = existing.length > 0 ? (existing[0].version || 0) + 1 : 1;

    const result = await query(
      `INSERT INTO course_deployments (project_id, user_id, deployment_url, deployment_status, version, published_at, created_at)
       VALUES ($1, $2, $3, 'published', $4, NOW(), NOW())
       RETURNING *`,
      [projectId, user.userId, deploymentUrl, newVersion]
    );

    return {
      status: 201,
      jsonBody: {
        success: true,
        deployment: result[0],
      },
    };
  } catch (error) {
    context.error('[CreateDeployment] Error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { status: 401, jsonBody: { success: false, error: 'Unauthorized' } };
    }
    return { status: 500, jsonBody: { success: false, error: error instanceof Error ? error.message : 'Unknown error' } };
  }
}

app.http('getDeployment', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'deployment/{projectId}',
  handler: getDeployment,
});

app.http('createDeployment', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'deployment',
  handler: createDeployment,
});

