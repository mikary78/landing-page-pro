/**
 * Get Projects Azure Function
 * Returns list of projects for the authenticated user
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query } from '../lib/database';

export async function getProjects(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Authenticate
    const user = await requireAuth(request, context);
    context.log(`[GetProjects] User: ${user.userId}`);

    // Ensure user profile exists
    await query(
      `INSERT INTO profiles (user_id, display_name, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [user.userId, user.name || user.email || 'Unknown User']
    );

    // Get projects for user (모든 프로젝트 포함, 코스 변환 여부 및 커버 이미지 포함)
    const projects = await query(
      `SELECT
        p.id,
        p.user_id,
        p.title,
        p.description,
        p.document_content,
        p.document_url,
        p.ai_model,
        p.education_stage,
        p.subject,
        p.duration_minutes,
        p.education_duration,
        p.education_course,
        p.education_session,
        p.status,
        p.created_at,
        p.updated_at,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM lessons WHERE project_id = p.id
          ) THEN true
          ELSE false
        END as is_converted_to_course,
        (
          SELECT ga.assets->'background'->>'dataUrl'
          FROM generation_jobs gj
          JOIN generation_artifacts ga ON gj.id = ga.job_id
          WHERE gj.project_id = p.id
            AND ga.artifact_type = 'cover'
            AND ga.assets IS NOT NULL
            AND ga.assets->'background' IS NOT NULL
            AND ga.assets->'background'->>'dataUrl' IS NOT NULL
          ORDER BY ga.created_at DESC
          LIMIT 1
        ) as cover_image_url
       FROM projects p
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [user.userId]
    );

    return {
      status: 200,
      jsonBody: {
        success: true,
        projects: projects || [],
      },
    };
  } catch (error) {
    context.error('[GetProjects] Error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { status: 401, jsonBody: { success: false, error: 'Unauthorized' } };
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

app.http('getProjects', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'getprojects',
  handler: getProjects,
});

