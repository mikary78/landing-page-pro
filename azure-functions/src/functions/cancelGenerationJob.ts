/**
 * Cancel Generation Job
 * - 사용자가 생성 작업을 중단 요청할 때 호출
 * - generation_jobs.status를 cancelled로 변경하고, pending step들을 cancelled로 표시
 *
 * 참고자료(외부):
 * - Azure Functions HTTP trigger (Node.js v4):
 *   https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node?tabs=v4
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { transaction } from '../lib/database';
import { isUuid } from '../lib/validation';

interface CancelGenerationJobRequest {
  projectId?: string;
  jobId?: string;
  reason?: string;
}

export async function cancelGenerationJob(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const user = await requireAuth(request, context);
    const body = (await request.json().catch(() => ({}))) as CancelGenerationJobRequest;

    const { projectId, jobId, reason } = body || {};

    if (!projectId && !jobId) {
      return { status: 400, jsonBody: { success: false, error: 'projectId or jobId is required' } };
    }
    if (projectId && !isUuid(projectId)) {
      return { status: 400, jsonBody: { success: false, error: 'Invalid projectId (UUID required)' } };
    }
    if (jobId && !isUuid(jobId)) {
      return { status: 400, jsonBody: { success: false, error: 'Invalid jobId (UUID required)' } };
    }

    const result = await transaction(async (client) => {
      const jobRes = await client.query(
        projectId
          ? `SELECT * FROM generation_jobs WHERE project_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1 FOR UPDATE`
          : `SELECT * FROM generation_jobs WHERE id = $1 AND user_id = $2 FOR UPDATE`,
        projectId ? [projectId, user.userId] : [jobId, user.userId]
      );

      if (jobRes.rows.length === 0) {
        return { found: false };
      }

      const job = jobRes.rows[0];

      // mark cancelled
      await client.query(
        `UPDATE generation_jobs
         SET status = 'cancelled', error = COALESCE($2, error), updated_at = NOW()
         WHERE id = $1`,
        [job.id, reason || null]
      );

      // mark pending steps as cancelled
      await client.query(
        `UPDATE generation_steps
         SET status = 'cancelled', error = COALESCE(error, 'Cancelled by user'), updated_at = NOW()
         WHERE job_id = $1 AND status IN ('pending')`,
        [job.id]
      );

      // reflect to project for UI
      await client.query(`UPDATE projects SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, [
        job.project_id,
      ]);

      return { found: true, jobId: job.id, status: 'cancelled' as const };
    });

    if (!result.found) {
      return { status: 404, jsonBody: { success: false, error: 'Job not found' } };
    }

    return { status: 200, jsonBody: { success: true, ...result } };
  } catch (error) {
    context.error('[CancelGenerationJob] Error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { status: 401, jsonBody: { success: false, error: 'Unauthorized' } };
    }
    return { status: 500, jsonBody: { success: false, error: error instanceof Error ? error.message : 'Unknown error' } };
  }
}

app.http('cancelGenerationJob', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'generation/cancel',
  handler: cancelGenerationJob,
});

