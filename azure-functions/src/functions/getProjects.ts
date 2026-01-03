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

    // Get projects for user (레슨에 연결된 프로젝트는 제외)
    const projects = await query(
      `SELECT 
        id,
        user_id,
        title,
        description,
        document_content,
        document_url,
        ai_model,
        education_stage,
        subject,
        duration_minutes,
        education_duration,
        education_course,
        education_session,
        status,
        created_at,
        updated_at
       FROM projects
       WHERE user_id = $1
         AND id NOT IN (
           SELECT project_id FROM lessons WHERE project_id IS NOT NULL
         )
       ORDER BY created_at DESC`,
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

