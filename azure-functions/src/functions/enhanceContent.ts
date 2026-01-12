/**
 * enhanceContent
 * 
 * 기존 콘텐츠 보강 (기존 내용 유지 + 개선)
 * - "더 자세히", "예시 추가", "난이도 낮춰서" 등의 요청 처리
 * 
 * 작성일: 2026-01-10
 * 참고: history/2026-01-10_project-coursebuilder-integration-plan.md
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { query } from '../lib/database';

// ============================================================
// 타입 정의
// ============================================================

type ContentType = 'lesson_plan' | 'slides' | 'hands_on_activity' | 'assessment' | 'supplementary_materials' | 'discussion_prompts' | 'instructor_notes';
type AiModel = 'gemini' | 'claude' | 'chatgpt';

interface EnhanceContentRequest {
  lessonId: string;
  contentType: ContentType;
  existingContent: any;
  enhanceRequest: string;  // "더 자세히", "예시 추가", "난이도 낮춰서" 등
  aiModel: AiModel;
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
  context.log(`[enhanceContent] AI 모델 호출: ${aiModel}`);

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
// 콘텐츠 타입별 보강 프롬프트
// ============================================================

function buildEnhancePrompt(
  contentType: ContentType,
  existingContent: any,
  enhanceRequest: string
): { system: string; prompt: string } {
  const contentTypeLabels: Record<ContentType, string> = {
    lesson_plan: '레슨 플랜',
    slides: '슬라이드',
    hands_on_activity: '실습 활동',
    assessment: '평가',
    supplementary_materials: '보충 자료',
    discussion_prompts: '토론 주제',
    instructor_notes: '강사 노트',
  };

  const system = `당신은 교육 콘텐츠 편집 전문가입니다.
기존 ${contentTypeLabels[contentType]} 콘텐츠를 개선/보강해주세요.

핵심 원칙:
1. 기존 구조와 핵심 내용은 유지
2. 요청 사항을 정확히 반영하여 개선
3. 일관된 품질과 톤 유지
4. 원본과 동일한 형식(JSON/Markdown)으로 출력

${contentType === 'slides' || contentType === 'assessment' || contentType === 'hands_on_activity'
  ? '출력은 반드시 기존과 동일한 JSON 형식으로 작성하세요.'
  : '출력은 Markdown 형식으로 작성하세요.'}`;

  const existingContentStr = typeof existingContent === 'string' 
    ? existingContent 
    : JSON.stringify(existingContent, null, 2);

  const prompt = `## 기존 ${contentTypeLabels[contentType]} 콘텐츠
\`\`\`
${existingContentStr}
\`\`\`

## 보강 요청
${enhanceRequest}

## 지시사항
위 기존 콘텐츠를 기반으로 보강 요청 사항을 반영하여 개선된 버전을 출력하세요.
기존 구조는 유지하면서 요청된 부분만 보강/수정하세요.
전체 콘텐츠를 출력해주세요 (수정된 부분만 아닌 전체).`;

  return { system, prompt };
}

// ============================================================
// 메인 함수
// ============================================================

export async function enhanceContent(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('[enhanceContent] 요청 수신');

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
    const body = await request.json() as EnhanceContentRequest;
    const { lessonId, contentType, existingContent, enhanceRequest, aiModel } = body;

    if (!lessonId || !contentType || !existingContent || !enhanceRequest || !aiModel) {
      return jsonResponse(400, { 
        success: false, 
        error: 'lessonId, contentType, existingContent, enhanceRequest, and aiModel are required' 
      });
    }

    context.log(`[enhanceContent] lessonId=${lessonId}, contentType=${contentType}, aiModel=${aiModel}`);
    context.log(`[enhanceContent] 보강 요청: ${enhanceRequest}`);

    // 레슨 존재 확인
    const lessonRows = await query<any>(
      `SELECT id, title FROM lessons WHERE id = $1`,
      [lessonId]
    );

    if (lessonRows.length === 0) {
      return jsonResponse(404, { success: false, error: 'Lesson not found' });
    }

    // 보강 프롬프트 생성
    const { system, prompt } = buildEnhancePrompt(contentType, existingContent, enhanceRequest);

    // AI 모델 호출
    const rawResult = await callAiModel(aiModel, prompt, system, context);

    // 결과 파싱
    let enhancedContent: any;
    let markdown: string | undefined;

    if (contentType === 'lesson_plan' || contentType === 'supplementary_materials' ||
        contentType === 'discussion_prompts' || contentType === 'instructor_notes') {
      // Markdown 형식
      markdown = rawResult;
      enhancedContent = { markdown: rawResult };
    } else {
      // JSON 형식 파싱 시도
      try {
        const jsonMatch = rawResult.match(/```json\n?([\s\S]*?)\n?```/) || 
                          rawResult.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : rawResult;
        enhancedContent = JSON.parse(jsonStr);
      } catch (parseError) {
        context.warn('[enhanceContent] JSON 파싱 실패, 원본 반환');
        enhancedContent = { raw: rawResult };
        markdown = rawResult;
      }
    }

    // 레슨 업데이트
    try {
      await query(
        `UPDATE lessons SET updated_at = NOW() WHERE id = $1`,
        [lessonId]
      );
    } catch (updateError) {
      context.warn('[enhanceContent] 레슨 업데이트 실패:', updateError);
    }

    context.log(`[enhanceContent] 보강 완료: ${contentType}`);

    return jsonResponse(200, {
      success: true,
      data: {
        contentType,
        content: enhancedContent,
        markdown,
        originalRequest: enhanceRequest,
      },
      message: `${contentType} 콘텐츠가 보강되었습니다.`,
    });

  } catch (error) {
    context.error('[enhanceContent] Error:', error);
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

app.http('enhanceContent', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'course/enhance-content',
  handler: enhanceContent,
});
