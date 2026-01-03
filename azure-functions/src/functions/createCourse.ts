/**
 * Create Course Azure Function
 * Creates a new course for the authenticated user
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query, transaction } from '../lib/database';

interface CreateCourseRequest {
  title: string;
  description?: string;
  level?: string;
  targetAudience?: string;
  totalDuration?: string;
}

export async function createCourse(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Authenticate
    const user = await requireAuth(request, context);
    context.log(`[CreateCourse] User: ${user.userId}`);

    // Ensure user profile exists
    await query(
      `INSERT INTO profiles (user_id, display_name, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [user.userId, user.name || user.email || 'Unknown User']
    );

    // Parse request body
    const body = (await request.json()) as CreateCourseRequest;
    const { title, description, level, targetAudience, totalDuration } = body;

    if (!title) {
      return {
        status: 400,
        jsonBody: { success: false, error: 'Title is required' },
      };
    }

    // Create course in transaction
    const course = await transaction(async (client) => {
      const result = await client.query(
        `INSERT INTO courses (
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
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *`,
        [
          user.userId,
          title,
          description || null,
          level || null,
          targetAudience || null,
          totalDuration || null,
          'draft', // Initial status
        ]
      );

      return result.rows[0];
    });

    return {
      status: 201,
      jsonBody: {
        success: true,
        course: course,
      },
    };
  } catch (error) {
    context.error('[CreateCourse] Error:', error);
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

app.http('createCourse', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'createcourse',
  handler: createCourse,
});

