/**
 * Create Project Azure Function
 * Creates a new project for the authenticated user
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query, transaction } from '../lib/database';

interface CreateProjectRequest {
  title: string;
  description?: string;
  documentContent?: string;
  aiModel?: 'gemini' | 'claude' | 'chatgpt';
  educationDuration?: string;
  educationCourse?: string;
  educationSession?: number;
  educationStage?: string;
  subject?: string;
  durationMinutes?: number;
}

export async function createProject(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Authenticate
    const user = await requireAuth(request, context);
    context.log(`[CreateProject] User: ${user.userId}`);

    // Ensure user profile exists
    await query(
      `INSERT INTO profiles (user_id, display_name, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [user.userId, user.name || user.email || 'Unknown User']
    );

    // Parse request body
    const body = (await request.json()) as CreateProjectRequest;
    const {
      title,
      description,
      documentContent,
      aiModel = 'gemini',
      educationDuration,
      educationCourse,
      educationSession,
      educationStage = 'elementary',
      subject,
      durationMinutes,
    } = body;

    if (!title) {
      return {
        status: 400,
        jsonBody: { success: false, error: 'Title is required' },
      };
    }

    // Create project in transaction
    const project = await transaction(async (client) => {
      const result = await client.query(
        `INSERT INTO projects (
          id,
          user_id,
          title,
          description,
          document_content,
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
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING *`,
        [
          user.userId,
          title,
          description || null,
          documentContent || null,
          aiModel,
          educationStage,
          subject || null,
          durationMinutes || null,
          educationDuration || null,
          educationCourse || null,
          educationSession || null,
          'processing', // Initial status
        ]
      );

      return result.rows[0];
    });

    return {
      status: 201,
      jsonBody: {
        success: true,
        project: project,
      },
    };
  } catch (error) {
    context.error('[CreateProject] Error:', error);
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

app.http('createProject', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: createProject,
});

