/**
 * Get Templates Azure Function
 * Returns list of project templates for the authenticated user
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query } from '../lib/database';

export async function getTemplates(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Authenticate
    const user = await requireAuth(request, context);
    context.log(`[GetTemplates] User: ${user.userId}`);

    // Ensure user profile exists
    await query(
      `INSERT INTO profiles (user_id, display_name, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [user.userId, user.name || user.email || 'Unknown User']
    );

    // Get templates for user
    const templates = await query(
      `SELECT 
        id,
        user_id,
        template_name,
        description,
        education_duration,
        education_course,
        education_session,
        ai_model,
        created_at,
        updated_at
       FROM project_templates
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [user.userId]
    );

    return {
      status: 200,
      jsonBody: {
        success: true,
        templates: templates || [],
      },
    };
  } catch (error) {
    context.error('[GetTemplates] Error:', error);
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

app.http('getTemplates', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: getTemplates,
});

