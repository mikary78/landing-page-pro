/**
 * Get Modules With Lessons Azure Function
 * Returns list of modules with their lessons for a course
 * 
 * 참고: CurriculumTreePane.tsx에서 사용
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query } from '../lib/database';

// 타입 정의
interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

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

interface ModuleWithLessons extends CourseModule {
  lessons: Lesson[];
}

export async function getModulesWithLessons(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Authenticate
    const user = await requireAuth(request, context);
    context.log(`[GetModulesWithLessons] User: ${user.userId}`);

    // Get courseId from URL params
    const courseId = request.params.courseId;
    if (!courseId) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Course ID is required',
        },
      };
    }

    // Verify course ownership
    const courseCheck = await query(
      `SELECT id FROM courses WHERE id = $1 AND owner_id = $2`,
      [courseId, user.userId]
    );

    if (courseCheck.length === 0) {
      return {
        status: 404,
        jsonBody: {
          success: false,
          error: 'Course not found or access denied',
        },
      };
    }

    // Get modules for the course
    // Note: description 컬럼이 테이블에 없을 수 있으므로 제외
    const modules = await query<CourseModule>(
      `SELECT 
        id,
        course_id,
        title,
        order_index,
        created_at,
        updated_at
       FROM course_modules
       WHERE course_id = $1
       ORDER BY order_index ASC`,
      [courseId]
    );

    // Get all lessons for these modules in one query
    const moduleIds = modules.map(m => m.id);
    
    let lessons: Lesson[] = [];
    if (moduleIds.length > 0) {
      lessons = await query<Lesson>(
        `SELECT 
          id,
          module_id,
          title,
          learning_objectives,
          project_id,
          order_index,
          selected_ai_model,
          created_at,
          updated_at
         FROM lessons
         WHERE module_id = ANY($1::uuid[])
         ORDER BY order_index ASC`,
        [moduleIds]
      );
    }

    // Group lessons by module
    const lessonsByModule = lessons.reduce((acc, lesson) => {
      if (!acc[lesson.module_id]) {
        acc[lesson.module_id] = [];
      }
      acc[lesson.module_id].push(lesson);
      return acc;
    }, {} as Record<string, Lesson[]>);

    // Combine modules with their lessons
    const modulesWithLessons: ModuleWithLessons[] = modules.map(module => ({
      ...module,
      lessons: lessonsByModule[module.id] || [],
    }));

    return {
      status: 200,
      jsonBody: {
        success: true,
        modules: modulesWithLessons,
      },
    };
  } catch (error) {
    context.error('[GetModulesWithLessons] Error:', error);
    
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

app.http('getModulesWithLessons', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'getmodules/{courseId}',
  handler: getModulesWithLessons,
});

