/**
 * generateSingleContent
 * 
 * 단일 콘텐츠 생성 (파이프라인 X, 특정 콘텐츠만)
 * - 슬라이드, 퀴즈, 실습 가이드, 읽기 자료, 요약 등
 * - 코스빌더에서 빠른 콘텐츠 생성용 (~1-2분)
 * 
 * 작성일: 2026-01-10
 * 참고: history/2026-01-10_project-coursebuilder-integration-plan.md
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { query } from '../lib/database';
import { getTargetAudienceGuide } from '../lib/agent/prompts';

// ============================================================
// 타입 정의
// ============================================================

type ContentType = 'lesson_plan' | 'slides' | 'hands_on_activity' | 'assessment' | 'supplementary_materials' | 'discussion_prompts' | 'instructor_notes';
type AiModel = 'gemini' | 'claude' | 'chatgpt';

interface SingleContentRequest {
  lessonId: string;
  contentType: ContentType;
  context: {
    lessonTitle: string;
    learningObjectives?: string[];
    targetAudience?: string;
    duration?: string;
    additionalInstructions?: string;
  };
  aiModel: AiModel;
}

interface GeneratedContent {
  contentType: ContentType;
  content: any;
  markdown?: string;
}

// ============================================================
// 콘텐츠 타입별 프롬프트 빌더
// ============================================================

// 1. 레슨 플랜
function buildLessonPlanPrompt(context: SingleContentRequest['context']): { system: string; prompt: string } {
  const audienceGuide = context.targetAudience
    ? getTargetAudienceGuide(context.targetAudience)
    : '';

  const system = `당신은 교육 설계 전문가(Instructional Designer)입니다.
프로젝트 생성 단계에서 만들어진 기본 레슨 플랜을 실제 수업용으로 더 상세하고 풍부하게 발전시킵니다.
${audienceGuide}

출력은 Markdown 형식으로 작성하세요:
# 레슨 플랜: [제목]
## 수업 정보
- 시간: 총 학습 시간 및 각 활동별 시간 배분
- 준비물: 필요한 자료와 도구
## 학습 목표
- 구체적이고 측정 가능한 목표 (SMART 기준)
## 도입 (5-10분)
- 동기 부여 및 사전 지식 활성화
## 전개 (30-40분)
- 교수 활동과 학습자 활동을 명확히 구분
- 각 활동의 시간 배분과 교수법
## 정리 (5-10분)
- 핵심 내용 정리 및 평가
## 교수자 팁
- 자주 하는 질문과 답변
- 난이도 조절 방법`;

  const prompt = `## 레슨 정보
- 제목: ${context.lessonTitle}
- 학습 목표: ${context.learningObjectives?.join('\n  - ') || '없음'}
- 교육 대상: ${context.targetAudience || '일반'}
- 시간: ${context.duration || '60분'}

${context.additionalInstructions ? `## 추가 지시사항\n${context.additionalInstructions}` : ''}

## 요청
위 레슨의 기본 정보를 바탕으로 실제 수업에 사용할 수 있는 상세한 레슨 플랜을 작성해주세요.
- 도입-전개-정리 구조로 명확하게 구성
- 각 단계별 시간 배분과 구체적인 활동 설명
- 교수자가 직접 활용할 수 있는 티칭 가이드 포함`;

  return { system, prompt };
}

// 2. 슬라이드
function buildSlidesOnlyPrompt(context: SingleContentRequest['context']): { system: string; prompt: string } {
  const audienceGuide = context.targetAudience
    ? getTargetAudienceGuide(context.targetAudience)
    : '';

  const system = `당신은 교육 프레젠테이션 설계 전문가입니다.
프로젝트 생성에서 만들어진 기본 슬라이드를 실제 강의용으로 보강하고 개선합니다.
${audienceGuide}

출력은 반드시 아래 JSON 형식으로 작성하세요:
{
  "deckTitle": "슬라이드 제목",
  "slides": [
    {
      "slideNumber": 1,
      "title": "슬라이드 제목",
      "bulletPoints": ["핵심 포인트 1", "핵심 포인트 2"],
      "notes": "발표자 노트 (강의 시 설명할 내용)",
      "visualSuggestion": "시각 자료 제안 (다이어그램, 이미지, 차트 등)",
      "transition": "전환 효과 제안 (선택사항)"
    }
  ]
}`;

  const prompt = `## 레슨 정보
- 제목: ${context.lessonTitle}
- 학습 목표: ${context.learningObjectives?.join('\n  - ') || '없음'}
- 교육 대상: ${context.targetAudience || '일반'}
- 시간: ${context.duration || '60분'}

${context.additionalInstructions ? `## 추가 지시사항\n${context.additionalInstructions}` : ''}

## 요청
위 레슨의 기본 슬라이드를 실제 강의용으로 보강해주세요.
- 총 10-15장 구성 (도입-본론-정리 구조)
- 각 슬라이드: 명확한 제목, 3-5개 핵심 포인트, 상세한 발표자 노트
- 시각 자료 제안 (그래프, 다이어그램, 이미지 등)
- 학습자의 이해를 돕는 예시와 사례 포함`;

  return { system, prompt };
}

// 3. 평가 (Assessment)
function buildAssessmentPrompt(context: SingleContentRequest['context']): { system: string; prompt: string } {
  const audienceGuide = context.targetAudience
    ? getTargetAudienceGuide(context.targetAudience)
    : '';

  const system = `당신은 교육 평가 설계 전문가입니다.
프로젝트 생성의 기본 평가를 확장하여 종합적인 학습 평가 도구를 개발합니다.
${audienceGuide}

출력은 반드시 아래 JSON 형식으로 작성하세요:
{
  "title": "평가 제목",
  "totalPoints": 100,
  "timeLimit": "60분",
  "instructions": "평가 안내문",
  "items": [
    {
      "questionNumber": 1,
      "questionType": "multiple_choice | true_false | short_answer | essay",
      "question": "문제",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
      "correctAnswer": "정답",
      "explanation": "상세 해설",
      "difficulty": "easy | medium | hard",
      "points": 10,
      "learningObjective": "연결된 학습 목표"
    }
  ],
  "rubric": "채점 기준 (에세이/서술형용)"
}`;

  const prompt = `## 레슨 정보
- 제목: ${context.lessonTitle}
- 학습 목표: ${context.learningObjectives?.join('\n  - ') || '없음'}
- 교육 대상: ${context.targetAudience || '일반'}

${context.additionalInstructions ? `## 추가 지시사항\n${context.additionalInstructions}` : ''}

## 요청
위 레슨의 학습 목표 달성도를 종합적으로 평가하는 평가 도구를 만들어주세요.
- 총 8-12문항 (객관식, 참/거짓, 단답형, 서술형 혼합)
- 난이도 분포: 쉬움 30%, 보통 50%, 어려움 20%
- 각 문항: 상세 해설, 배점, 연결 학습 목표 명시
- 서술형/에세이 문항용 채점 루브릭 포함`;

  return { system, prompt };
}

// 4. 실습 활동 (Hands-on Activity)
function buildHandsOnActivityPrompt(context: SingleContentRequest['context']): { system: string; prompt: string } {
  const audienceGuide = context.targetAudience
    ? getTargetAudienceGuide(context.targetAudience)
    : '';

  const system = `당신은 실무 중심 교육 설계 전문가입니다.
프로젝트 생성의 기본 실습 템플릿을 학습자가 직접 따라할 수 있는 상세한 실습 가이드로 발전시킵니다.
${audienceGuide}

출력은 반드시 아래 JSON 형식으로 작성하세요:
{
  "title": "실습 제목",
  "estimatedTime": "예상 소요 시간",
  "difficulty": "beginner | intermediate | advanced",
  "prerequisites": ["사전 준비 사항"],
  "objectives": ["실습 목표"],
  "materials": ["필요한 도구/자료"],
  "steps": [
    {
      "stepNumber": 1,
      "title": "단계 제목",
      "instruction": "상세 지시사항",
      "codeExample": "예제 코드 (해당시)",
      "expectedResult": "예상 결과",
      "checkpoints": ["체크포인트"],
      "tips": "유용한 팁",
      "troubleshooting": "문제 해결 방법"
    }
  ],
  "validation": "완성 기준",
  "extensions": "심화 과제"
}`;

  const prompt = `## 레슨 정보
- 제목: ${context.lessonTitle}
- 학습 목표: ${context.learningObjectives?.join('\n  - ') || '없음'}
- 교육 대상: ${context.targetAudience || '일반'}
- 시간: ${context.duration || '60분'}

${context.additionalInstructions ? `## 추가 지시사항\n${context.additionalInstructions}` : ''}

## 요청
위 레슨의 기본 실습 템플릿을 학습자가 직접 따라할 수 있는 상세한 실습 가이드로 만들어주세요.
- 7-12개의 명확한 단계로 구성
- 각 단계: 상세 지시사항, 예제 코드(해당시), 예상 결과, 체크포인트
- 트러블슈팅 가이드 포함
- 완성 기준과 심화 과제 제시`;

  return { system, prompt };
}

// 5. 보충 자료 (Supplementary Materials)
function buildSupplementaryMaterialsPrompt(context: SingleContentRequest['context']): { system: string; prompt: string } {
  const audienceGuide = context.targetAudience
    ? getTargetAudienceGuide(context.targetAudience)
    : '';

  const system = `당신은 교육 자료 큐레이션 전문가입니다.
레슨을 보충하고 심화 학습을 지원하는 다양한 학습 자료를 제공합니다.
${audienceGuide}

출력은 Markdown 형식으로 작성하세요:
# 보충 학습 자료: [제목]
## 핵심 개념 심화
- 주요 개념에 대한 상세 설명
## 참고 문헌
- 추천 도서, 논문, 웹사이트
## 사례 연구
- 실제 적용 사례
## 인포그래픽/다이어그램 제안
- 시각화 자료 설명
## 추천 학습 경로
- 다음 학습 주제`;

  const prompt = `## 레슨 정보
- 제목: ${context.lessonTitle}
- 학습 목표: ${context.learningObjectives?.join('\n  - ') || '없음'}
- 교육 대상: ${context.targetAudience || '일반'}

${context.additionalInstructions ? `## 추가 지시사항\n${context.additionalInstructions}` : ''}

## 요청
위 레슨을 보충하고 심화 학습을 지원하는 자료를 만들어주세요.
- 핵심 개념 심화 설명 (1500-2000자)
- 참고 문헌 및 추천 리소스 (도서, 논문, 웹사이트)
- 실제 적용 사례 2-3개
- 인포그래픽/다이어그램 제안
- 추천 학습 경로`;

  return { system, prompt };
}

// 6. 토론 주제 (Discussion Prompts)
function buildDiscussionPromptsPrompt(context: SingleContentRequest['context']): { system: string; prompt: string } {
  const audienceGuide = context.targetAudience
    ? getTargetAudienceGuide(context.targetAudience)
    : '';

  const system = `당신은 협력 학습 설계 전문가입니다.
학습자의 능동적 참여와 비판적 사고를 촉진하는 토론 주제를 개발합니다.
${audienceGuide}

출력은 Markdown 형식으로 작성하세요:
# 토론 및 협업 활동: [제목]
## 토론 주제
### 주제 1
- 핵심 질문
- 토론 가이드라인
- 예상 논점
## 그룹 활동
- 활동 설명
- 역할 분담
## 사례 분석
- 사례 설명
- 분석 질문
## 성찰 질문
- 개인 성찰 프롬프트`;

  const prompt = `## 레슨 정보
- 제목: ${context.lessonTitle}
- 학습 목표: ${context.learningObjectives?.join('\n  - ') || '없음'}
- 교육 대상: ${context.targetAudience || '일반'}

${context.additionalInstructions ? `## 추가 지시사항\n${context.additionalInstructions}` : ''}

## 요청
위 레슨의 학습 목표를 달성하기 위한 토론 및 협업 활동을 설계해주세요.
- 3-5개의 토론 주제 (핵심 질문, 토론 가이드라인, 예상 논점)
- 1-2개의 그룹 활동 (팀 프로젝트, 역할극 등)
- 사례 분석 1-2개 (실제 사례와 분석 질문)
- 개인 성찰 질문 5-7개`;

  return { system, prompt };
}

// 7. 강사 노트 (Instructor Notes)
function buildInstructorNotesPrompt(context: SingleContentRequest['context']): { system: string; prompt: string } {
  const system = `당신은 교수법 컨설턴트입니다.
강사가 효과적으로 가르칠 수 있도록 티칭 가이드와 팁을 제공합니다.

출력은 Markdown 형식으로 작성하세요:
# 강사 가이드: [제목]
## 수업 운영 팁
- 시간 관리 전략
- 학습자 참여 유도 방법
## 자주 하는 질문 (FAQ)
- Q: 질문
  A: 답변
## 난이도 조절
- 초보자용 조정사항
- 고급 학습자용 조정사항
## 일반적인 어려움과 해결책
- 학습자가 자주 겪는 어려움
- 교수 전략
## 평가 기준
- 학습 목표 달성도 체크리스트`;

  const prompt = `## 레슨 정보
- 제목: ${context.lessonTitle}
- 학습 목표: ${context.learningObjectives?.join('\n  - ') || '없음'}
- 교육 대상: ${context.targetAudience || '일반'}
- 시간: ${context.duration || '60분'}

${context.additionalInstructions ? `## 추가 지시사항\n${context.additionalInstructions}` : ''}

## 요청
위 레슨을 효과적으로 가르치기 위한 강사 가이드를 작성해주세요.
- 수업 운영 팁 (시간 관리, 참여 유도 방법)
- 자주 하는 질문 (FAQ) 7-10개
- 난이도 조절 방법 (초보자/고급 학습자)
- 학습자가 자주 겪는 어려움과 교수 전략
- 학습 목표 달성도 체크리스트`;

  return { system, prompt };
}

// ============================================================
// AI 모델 호출
// ============================================================

async function callAiModel(
  aiModel: AiModel,
  prompt: string,
  systemPrompt: string,
  context: InvocationContext
): Promise<string> {
  context.log(`[generateSingleContent] AI 모델 호출: ${aiModel}`);

  if (aiModel === 'gemini') {
    // 프로젝트 생성과 동일한 방식 사용 (ai-services.ts의 generateWithGemini와 동일)
    const { generateWithGemini } = await import('../lib/ai-services');
    return await generateWithGemini(prompt, systemPrompt);
  } else if (aiModel === 'claude') {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
    
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });
    
    return response.content[0].type === 'text' ? response.content[0].text : '';
  } else {
    // ChatGPT
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 4096,
      temperature: 0.7,
    });
    
    return response.choices[0]?.message?.content || '';
  }
}

// ============================================================
// 메인 함수
// ============================================================

export async function generateSingleContent(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('[generateSingleContent] 요청 수신');

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    };
  }

  try {
    const body = await request.json() as SingleContentRequest;
    const { lessonId, contentType, context: contentContext, aiModel } = body;

    if (!lessonId || !contentType || !aiModel) {
      return jsonResponse(400, { 
        success: false, 
        error: 'lessonId, contentType, and aiModel are required' 
      });
    }

    context.log(`[generateSingleContent] lessonId=${lessonId}, contentType=${contentType}, aiModel=${aiModel}`);

    // 레슨 정보 조회
    const lessonRows = await query<any>(
      `SELECT l.*, m.course_id, c.target_audience, c.total_duration
       FROM lessons l
       JOIN course_modules m ON l.module_id = m.id
       JOIN courses c ON m.course_id = c.id
       WHERE l.id = $1`,
      [lessonId]
    );

    if (lessonRows.length === 0) {
      return jsonResponse(404, { success: false, error: 'Lesson not found' });
    }

    const lesson = lessonRows[0];

    // 컨텍스트 보강
    const enrichedContext = {
      lessonTitle: contentContext.lessonTitle || lesson.title,
      learningObjectives: contentContext.learningObjectives || 
        (lesson.learning_objectives?.split('\n').filter(Boolean) || []),
      targetAudience: contentContext.targetAudience || lesson.target_audience,
      duration: contentContext.duration || lesson.total_duration,
      additionalInstructions: contentContext.additionalInstructions,
    };

    // 콘텐츠 타입별 프롬프트 생성
    const promptBuilders: Record<ContentType, (ctx: typeof enrichedContext) => { system: string; prompt: string }> = {
      lesson_plan: buildLessonPlanPrompt,
      slides: buildSlidesOnlyPrompt,
      hands_on_activity: buildHandsOnActivityPrompt,
      assessment: buildAssessmentPrompt,
      supplementary_materials: buildSupplementaryMaterialsPrompt,
      discussion_prompts: buildDiscussionPromptsPrompt,
      instructor_notes: buildInstructorNotesPrompt,
    };

    const { system, prompt } = promptBuilders[contentType](enrichedContext);

    // AI 모델 호출
    const rawResult = await callAiModel(aiModel, prompt, system, context);

    // 결과 파싱 (JSON 또는 Markdown)
    let parsedContent: any;
    let markdown: string | undefined;

    if (contentType === 'lesson_plan' || contentType === 'supplementary_materials' ||
        contentType === 'discussion_prompts' || contentType === 'instructor_notes') {
      // Markdown 형식
      markdown = rawResult;
      parsedContent = { markdown: rawResult };
    } else {
      // JSON 형식 파싱 시도
      try {
        const jsonMatch = rawResult.match(/```json\n?([\s\S]*?)\n?```/) || 
                          rawResult.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : rawResult;
        parsedContent = JSON.parse(jsonStr);
      } catch (parseError) {
        context.warn('[generateSingleContent] JSON 파싱 실패, 원본 반환');
        parsedContent = { raw: rawResult };
        markdown = rawResult;
      }
    }

    // 레슨에 콘텐츠 저장 (JSON 컬럼에 저장)
    // lesson_contents 컬럼이 있다면 업데이트, 없다면 별도 처리
    // 여기서는 lessons 테이블의 확장 컬럼에 저장
    const contentColumnMap: Record<ContentType, string> = {
      lesson_plan: 'lesson_plan_content',
      slides: 'slides_content',
      hands_on_activity: 'hands_on_activity_content',
      assessment: 'assessment_content',
      supplementary_materials: 'supplementary_materials_content',
      discussion_prompts: 'discussion_prompts_content',
      instructor_notes: 'instructor_notes_content',
    };

    // 동적 컬럼 업데이트 (컬럼이 있는 경우에만)
    try {
      await query(
        `UPDATE lessons SET 
          content_source = 'ai_generated',
          updated_at = NOW()
        WHERE id = $1`,
        [lessonId]
      );
    } catch (updateError) {
      context.warn('[generateSingleContent] 레슨 업데이트 실패:', updateError);
    }

    const result: GeneratedContent = {
      contentType,
      content: parsedContent,
      markdown,
    };

    context.log(`[generateSingleContent] 생성 완료: ${contentType}`);

    return jsonResponse(200, {
      success: true,
      data: result,
      message: `${contentType} 콘텐츠가 생성되었습니다.`,
    });

  } catch (error) {
    context.error('[generateSingleContent] Error:', error);
    return jsonResponse(500, {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

// ============================================================
// 헬퍼 함수
// ============================================================

function jsonResponse(status: number, body: any): HttpResponseInit {
  return {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}

// ============================================================
// 라우트 등록
// ============================================================

app.http('generateSingleContent', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'course/generate-content',
  handler: generateSingleContent,
});
