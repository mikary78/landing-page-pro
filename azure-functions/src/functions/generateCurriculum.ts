/**
 * Generate Curriculum Azure Function
 * Converts Supabase Edge Function to Azure Function
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../middleware/auth';
import { query } from '../lib/database';
import { generateContent } from '../lib/ai-services';

interface GenerateCurriculumRequest {
  courseId: string;
  courseTitle: string;
  courseDescription?: string;
  level?: string;
  targetAudience?: string;
  totalDuration?: string;
  aiModel: 'gemini' | 'claude' | 'chatgpt';
}

interface ModuleData {
  title: string;
  summary?: string;
  order_index: number;
  lessons: LessonData[];
}

interface LessonData {
  title: string;
  learning_objectives?: string;
  order_index: number;
}

interface CurriculumResponse {
  modules: ModuleData[];
}

/**
 * Generate curriculum function
 */
export async function generateCurriculum(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Authenticate
    const user = await requireAuth(request, context);
    context.log(`[GenerateCurriculum] User: ${user.userId}`);

    // Ensure user profile exists
    await query(
      `INSERT INTO profiles (user_id, display_name, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [user.userId, user.name || user.email || 'Unknown User']
    );

    // Parse request body
    const body = (await request.json()) as GenerateCurriculumRequest;
    const {
      courseId,
      courseTitle,
      courseDescription,
      level,
      targetAudience,
      totalDuration,
      aiModel,
    } = body;

    if (!courseId || !courseTitle || !aiModel) {
      return {
        status: 400,
        jsonBody: { error: 'Missing required fields: courseId, courseTitle, aiModel' },
      };
    }

    context.log(`Generate curriculum request: ${courseTitle} (${aiModel})`);

    // Verify course belongs to user (or create if not exists for testing)
    const courses = await query(
      'SELECT * FROM courses WHERE id = $1 AND owner_id = $2',
      [courseId, user.userId]
    );

    if (courses.length === 0) {
      // Create test course if it doesn't exist
      context.log(`Course ${courseId} not found, creating test course`);
      await query(
        `INSERT INTO courses (id, owner_id, title, description, level, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'draft', NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [courseId, user.userId, courseTitle, courseDescription || 'Test course', level || 'beginner']
      );
    }

    // Build AI prompt
    const curriculumPrompt = `당신은 교육 커리큘럼 설계 전문가입니다. 다음 코스 정보를 바탕으로 체계적이고 실용적인 커리큘럼 구조를 생성해주세요.

코스 정보:
- 제목: ${courseTitle}
- 설명: ${courseDescription || '설명 없음'}
- 난이도: ${level || '미지정'}
- 타겟 학습자: ${targetAudience || '미지정'}
- 총 기간: ${totalDuration || '미지정'}

요구사항:
1. 총 기간(${totalDuration})에 맞춰 적절한 수의 모듈과 레슨을 구성하세요.
2. 각 모듈은 명확한 학습 목표를 가져야 합니다.
3. 각 레슨은 구체적인 학습 목표(learning_objectives)를 가져야 합니다.
4. 모듈과 레슨은 논리적인 순서로 배치하세요.

다음 JSON 형식으로만 응답해주세요 (다른 텍스트 없이):
{
  "modules": [
    {
      "title": "모듈 제목",
      "summary": "모듈 요약 설명",
      "order_index": 1,
      "lessons": [
        {
          "title": "레슨 제목",
          "learning_objectives": "이 레슨에서 학습할 내용과 목표",
          "order_index": 1
        }
      ]
    }
  ]
}`;

    const systemPrompt =
      '당신은 교육 커리큘럼 설계 전문가입니다. 요청된 형식의 JSON만 반환하세요.';

    // Generate curriculum using AI
    context.log(`Calling AI API with model: ${aiModel}`);
    const aiContent = await generateContent(aiModel, curriculumPrompt, systemPrompt);

    if (!aiContent) {
      throw new Error('AI 응답에서 콘텐츠를 찾을 수 없습니다.');
    }

    context.log('AI response received, length:', aiContent.length);

    // Parse JSON response (remove markdown code blocks if present)
    let curriculumData: CurriculumResponse;
    try {
      const jsonMatch = aiContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : aiContent.trim();
      curriculumData = JSON.parse(jsonString);
    } catch (parseError) {
      context.error('JSON parsing error:', parseError);
      context.error('AI response content:', aiContent);
      throw new Error('AI 응답을 JSON으로 파싱할 수 없습니다.');
    }

    if (!curriculumData.modules || !Array.isArray(curriculumData.modules)) {
      throw new Error('AI 응답에 modules 배열이 없습니다.');
    }

    context.log(`Parsed ${curriculumData.modules.length} modules`);

    // Insert modules and lessons into database
    const createdModules: string[] = [];
    const createdLessons: string[] = [];

    for (const moduleData of curriculumData.modules) {
      // Create module
      const moduleResult = await query(
        `INSERT INTO course_modules (course_id, title, summary, order_index, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id`,
        [
          courseId,
          moduleData.title || `모듈 ${moduleData.order_index}`,
          moduleData.summary || null,
          moduleData.order_index || 1,
        ]
      );

      if (moduleResult.length === 0) {
        context.error(`Failed to create module ${moduleData.order_index}`);
        continue;
      }

      const moduleId = moduleResult[0].id;
      createdModules.push(moduleId);

      // Create lessons
      if (moduleData.lessons && Array.isArray(moduleData.lessons)) {
        for (const lessonData of moduleData.lessons) {
          const lessonResult = await query(
            `INSERT INTO lessons (module_id, title, learning_objectives, order_index, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())
             RETURNING id`,
            [
              moduleId,
              lessonData.title || `레슨 ${lessonData.order_index}`,
              lessonData.learning_objectives || null,
              lessonData.order_index || 1,
            ]
          );

          if (lessonResult.length > 0) {
            createdLessons.push(lessonResult[0].id);
          } else {
            context.error(`Failed to create lesson ${lessonData.order_index}`);
          }
        }
      }
    }

    context.log(
      `Created ${createdModules.length} modules and ${createdLessons.length} lessons`
    );

    // Success response
    return {
      status: 200,
      jsonBody: {
        success: true,
        message: '커리큘럼이 성공적으로 생성되었습니다.',
        data: {
          modulesCreated: createdModules.length,
          lessonsCreated: createdLessons.length,
        },
      },
    };
  } catch (error: unknown) {
    context.error('[GenerateCurriculum] Error:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage === 'Unauthorized') {
      return {
        status: 401,
        jsonBody: { error: 'Unauthorized' },
      };
    }

    return {
      status: 500,
      jsonBody: { error: errorMessage || '커리큘럼 생성 중 오류가 발생했습니다.' },
    };
  }
}

// Register function
app.http('generateCurriculum', {
  methods: ['POST'],
  authLevel: 'anonymous', // We handle auth in the function
  handler: generateCurriculum,
});
