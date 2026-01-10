/**
 * Get Generation Job (Agent Orchestration)
 * - Studio UI에서 job/steps/artifacts 상태 조회 용도
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query } from '../lib/database';
import { isUuid } from '../lib/validation';

export async function getGenerationJob(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const user = await requireAuth(request, context);

    const projectId = request.params.projectId;
    if (!projectId) {
      return { status: 400, jsonBody: { success: false, error: 'Project ID is required' } };
    }

        if (!isUuid(projectId)) {
          return { status: 400, jsonBody: { success: false, error: 'Invalid projectId (UUID required)' } };
        }

    // 프로젝트 소유권 확인
    const projectCheck = await query(`SELECT id FROM projects WHERE id = $1 AND user_id = $2`, [
      projectId,
      user.userId,
    ]);
    if (projectCheck.length === 0) {
      return { status: 404, jsonBody: { success: false, error: 'Project not found or access denied' } };
    }

    const jobs = await query(
      `SELECT * FROM generation_jobs WHERE project_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [projectId, user.userId]
    );
    if (jobs.length === 0) {
      return { status: 200, jsonBody: { success: true, job: null, steps: [], artifacts: [] } };
    }

    const job = jobs[0];
    const steps = await query(
      `SELECT * FROM generation_steps WHERE job_id = $1 ORDER BY order_index ASC`,
      [job.id]
    );
    const artifacts = await query(
      `SELECT * FROM generation_artifacts WHERE job_id = $1 ORDER BY artifact_type ASC`,
      [job.id]
    );

    return { status: 200, jsonBody: { success: true, job, steps, artifacts } };
  } catch (error) {
    context.error('[GetGenerationJob] Error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { status: 401, jsonBody: { success: false, error: 'Unauthorized' } };
    }
    return { status: 500, jsonBody: { success: false, error: error instanceof Error ? error.message : 'Unknown error' } };
  }
}

app.http('getGenerationJob', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'generation/job/{projectId}',
  handler: getGenerationJob,
});

