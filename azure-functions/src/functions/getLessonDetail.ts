/**
 * Get Lesson Detail Azure Function
 * Returns lesson with related project and AI results
 * 
 * 참고: LessonDetailPane.tsx에서 사용
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query } from '../lib/database';

// 타입 정의
interface Lesson {
  id: string;
  module_id: string;
  title: string;
  learning_objectives?: string;
  project_id?: string;
  order_index: number;
  selected_ai_model?: string;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  document_content?: string;
  ai_model: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface AiResult {
  id: string;
  project_id: string;
  ai_model: string;
  status: string;
  generated_content?: string;
  created_at: string;
  updated_at: string;
}

export async function getLessonDetail(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Authenticate
    const user = await requireAuth(request, context);
    context.log(`[GetLessonDetail] User: ${user.userId}`);

    // Get lessonId from URL params
    const lessonId = request.params.lessonId;
    if (!lessonId) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Lesson ID is required',
        },
      };
    }

    // Get lesson with ownership check through module -> course
    const lessons = await query<Lesson>(
      `SELECT l.*
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
    let project: Project | null = null;
    let aiResults: AiResult[] = [];

    // If lesson has project_id, get project and AI results
    if (lesson.project_id) {
      const projects = await query<Project>(
        `SELECT * FROM projects WHERE id = $1`,
        [lesson.project_id]
      );
      project = projects[0] || null;

      if (project) {
        aiResults = await query<AiResult>(
          `SELECT * FROM project_ai_results WHERE project_id = $1`,
          [lesson.project_id]
        );
      }
    }

    return {
      status: 200,
      jsonBody: {
        success: true,
        lesson,
        project,
        aiResults,
      },
    };
  } catch (error) {
    context.error('[GetLessonDetail] Error:', error);
    
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

app.http('getLessonDetail', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'getlesson/{lessonId}',
  handler: getLessonDetail,
});

