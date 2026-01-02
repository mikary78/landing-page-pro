/**
 * Create Lesson Project Azure Function
 * Creates a project for a lesson and links it
 * 
 * 참고: LessonDetailPane.tsx에서 사용 (AI 콘텐츠 생성 시)
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query, transaction } from '../lib/database';

interface CreateLessonProjectRequest {
  lessonId: string;
  aiModel: string;
}

export async function createLessonProject(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Authenticate
    const user = await requireAuth(request, context);
    context.log(`[CreateLessonProject] User: ${user.userId}`);

    // Parse request body
    const body = await request.json() as CreateLessonProjectRequest;
    const { lessonId, aiModel } = body;

    if (!lessonId || !aiModel) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Lesson ID and AI model are required',
        },
      };
    }

    // Get lesson with ownership check
    const lessons = await query(
      `SELECT l.*, c.owner_id
       FROM lessons l
       JOIN course_modules cm ON l.module_id = cm.id
       JOIN courses c ON cm.course_id = c.id
       WHERE l.id = $1 AND c.owner_id = $2`,
      [lessonId, user.userId]
    );

    if (lessons.length === 0) {
      return {
        status: 404,
        jsonBody: {
          success: false,
          error: 'Lesson not found or access denied',
        },
      };
    }

    const lesson = lessons[0];

    // If lesson already has a project, return it
    if (lesson.project_id) {
      const existingProject = await query(
        `SELECT * FROM projects WHERE id = $1`,
        [lesson.project_id]
      );
      
      return {
        status: 200,
        jsonBody: {
          success: true,
          project: existingProject[0],
          existed: true,
        },
      };
    }

    // Create project and link to lesson in a transaction
    const result = await transaction(async (client) => {
      // Ensure profile exists
      await client.query(
        `INSERT INTO profiles (user_id, display_name, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         ON CONFLICT (user_id) DO NOTHING`,
        [user.userId, user.name || user.email || 'User']
      );

      // Create project
      const projectResult = await client.query(
        `INSERT INTO projects (user_id, title, description, document_content, ai_model, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'processing', NOW(), NOW())
         RETURNING *`,
        [
          user.userId,
          lesson.title,
          lesson.learning_objectives || null,
          lesson.learning_objectives || lesson.title || '',
          aiModel,
        ]
      );

      const newProject = projectResult.rows[0];

      // Update lesson with project_id
      await client.query(
        `UPDATE lessons SET project_id = $1, updated_at = NOW() WHERE id = $2`,
        [newProject.id, lessonId]
      );

      return newProject;
    });

    return {
      status: 201,
      jsonBody: {
        success: true,
        project: result,
        existed: false,
      },
    };
  } catch (error) {
    context.error('[CreateLessonProject] Error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return {
        status: 401,
        jsonBody: {
          success: false,
          error: 'Unauthorized',
        },
      };
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

app.http('createLessonProject', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'createlessonproject',
  handler: createLessonProject,
});

