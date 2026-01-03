/**
 * Get Courses Azure Function
 * Returns list of courses for the authenticated user
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query } from '../lib/database';

export async function getCourses(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Authenticate
    const user = await requireAuth(request, context);
    context.log(`[GetCourses] User: ${user.userId}`);

    // Ensure user profile exists
    await query(
      `INSERT INTO profiles (user_id, display_name, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [user.userId, user.name || user.email || 'Unknown User']
    );

    // Get courses for user
    const courses = await query(
      `SELECT 
        id,
        owner_id,
        title,
        description,
        level,
        target_audience,
        total_duration,
        status,
        created_at,
        updated_at
       FROM courses
       WHERE owner_id = $1
       ORDER BY created_at DESC`,
      [user.userId]
    );

    return {
      status: 200,
      jsonBody: {
        success: true,
        courses: courses || [],
      },
    };
  } catch (error) {
    context.error('[GetCourses] Error:', error);
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

app.http('getCourses', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'getcourses',
  handler: getCourses,
});

