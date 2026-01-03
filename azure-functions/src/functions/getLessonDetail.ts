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
    let stages: any[] = [];

    // If lesson has project_id, get project, AI results, and stages
    if (lesson.project_id) {
      const projects = await query<Project>(
        `SELECT * FROM projects WHERE id = $1`,
        [lesson.project_id]
      );
      project = projects[0] || null;

      if (project) {
        // project_ai_results 테이블에서 조회
        aiResults = await query<AiResult>(
          `SELECT * FROM project_ai_results WHERE project_id = $1 ORDER BY created_at DESC`,
          [lesson.project_id]
        );

        // project_stages 테이블에서도 조회 (processDocument가 이 테이블에 저장함)
        stages = await query(
          `SELECT * FROM project_stages WHERE project_id = $1 ORDER BY order_index ASC`,
          [lesson.project_id]
        );

        // aiResults가 비어있고 stages가 있으면, stages를 aiResults 형태로 변환
        if (aiResults.length === 0 && stages.length > 0) {
          // stages의 첫 번째 항목에서 AI 모델 추론 또는 project의 ai_model 사용
          const aiModel = project.ai_model || 'gemini';
          
          // stages를 하나의 aiResult로 합침
          const combinedContent = stages.map((s: any) => 
            `## ${s.stage_name || `단계 ${s.order_index + 1}`}\n\n${s.content || '(내용 없음)'}`
          ).join('\n\n---\n\n');

          aiResults = [{
            id: `stage-result-${lesson.project_id}`,
            project_id: lesson.project_id,
            ai_model: aiModel,
            status: stages.every((s: any) => s.status === 'completed') ? 'completed' : 'processing',
            generated_content: combinedContent,
            created_at: stages[0]?.created_at || new Date().toISOString(),
            updated_at: stages[stages.length - 1]?.updated_at || new Date().toISOString(),
          }];
        }
      }
    }

    return {
      status: 200,
      jsonBody: {
        success: true,
        lesson,
        project,
        aiResults,
        stages,
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

