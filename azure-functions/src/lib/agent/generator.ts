/**
 * AI 콘텐츠 생성 유틸리티 - 검증 및 자동 재시도 로직
 * 
 * 참고자료:
 * - Retry Pattern: https://learn.microsoft.com/en-us/azure/architecture/patterns/retry
 */

import { InvocationContext } from '@azure/functions';
import { generateContent } from '../ai-services';
import { ValidationResult, generateValidationFeedback } from './validation';

// ============================================================
// 타입 정의
// ============================================================

export interface GenerateWithRetryOptions<T> {
  /** 단계 이름 (로깅용) */
  stageName: string;
  /** AI 모델 */
  aiModel: 'gemini' | 'claude' | 'chatgpt';
  /** 시스템 프롬프트 */
  systemPrompt: string;
  /** 프롬프트 빌더 함수 */
  buildPrompt: (validationFeedback?: string) => string;
  /** JSON 파서 */
  parseOutput: (text: string) => T | null;
  /** 검증 함수 */
  validate: (output: T) => ValidationResult;
  /** 최대 재시도 횟수 (기본: 2) */
  maxRetries?: number;
  /** Azure Functions 컨텍스트 (로깅용) */
  context?: InvocationContext;
}

export interface GenerateResult<T> {
  /** 파싱된 구조화 출력 */
  structured: T | null;
  /** 원본 텍스트 (파싱 실패 시) */
  rawText: string | null;
  /** 최종 검증 결과 */
  validation: ValidationResult | null;
  /** 성공 여부 */
  success: boolean;
  /** 시도 횟수 */
  attempts: number;
}

// ============================================================
// 재시도 로직을 포함한 생성 함수
// ============================================================

/**
 * 검증과 자동 재시도를 포함한 AI 콘텐츠 생성
 * 
 * @example
 * const result = await generateWithRetry({
 *   stageName: 'curriculum_design',
 *   aiModel: 'gemini',
 *   systemPrompt: STAGE_PERSONAS.curriculum_design,
 *   buildPrompt: (feedback) => buildCurriculumPrompt(briefing, feedback),
 *   parseOutput: (text) => safeJsonParse<CurriculumOutput>(text),
 *   validate: (output) => validateCurriculum(output, briefing),
 *   context,
 * });
 */
export async function generateWithRetry<T>(
  options: GenerateWithRetryOptions<T>
): Promise<GenerateResult<T>> {
  const {
    stageName,
    aiModel,
    systemPrompt,
    buildPrompt,
    parseOutput,
    validate,
    maxRetries = 2,
    context,
  } = options;

  let structured: T | null = null;
  let rawText: string | null = null;
  let lastValidation: ValidationResult | null = null;
  let validationFeedback: string | undefined;
  let attempts = 0;

  const log = (message: string) => {
    if (context) {
      context.log(`[${stageName}] ${message}`);
    } else {
      console.log(`[${stageName}] ${message}`);
    }
  };

  const warn = (message: string) => {
    if (context) {
      context.warn(`[${stageName}] ${message}`);
    } else {
      console.warn(`[${stageName}] ${message}`);
    }
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    attempts = attempt + 1;
    
    // 프롬프트 생성
    const prompt = buildPrompt(validationFeedback);
    
    log(`시도 ${attempts}/${maxRetries + 1}`);
    
    // AI 호출
    const text = await generateContent(aiModel, prompt, systemPrompt);
    rawText = text;
    
    // JSON 파싱 시도
    const parsed = parseOutput(text);
    
    if (parsed) {
      // 검증 실행
      const validation = validate(parsed);
      lastValidation = validation;
      
      if (validation.isValid) {
        structured = parsed;
        log(`검증 통과`);
        return {
          structured,
          rawText,
          validation,
          success: true,
          attempts,
        };
      } else {
        log(`검증 실패: ${validation.issues.join(', ')}`);
        validationFeedback = generateValidationFeedback(validation, stageName);
        
        // 마지막 시도면 경고와 함께 결과 반환
        if (attempt === maxRetries) {
          structured = parsed;
          warn(`검증 실패했지만 계속 진행: ${validation.issues.join(', ')}`);
        }
      }
    } else {
      // JSON 파싱 실패
      warn(`JSON 파싱 실패`);
      
      if (attempt < maxRetries) {
        validationFeedback = `\n## ⚠️ 이전 출력 형식 오류\n출력이 유효한 JSON이 아닙니다. 반드시 순수 JSON 형식으로만 출력하세요. \`\`\`json 마크다운 코드블록도 사용하지 마세요.\n`;
      }
    }
  }

  return {
    structured,
    rawText,
    validation: lastValidation,
    success: structured !== null,
    attempts,
  };
}

// ============================================================
// 프롬프트 빌더 헬퍼
// ============================================================

/**
 * 슬라이드 프롬프트 빌더
 */
export function buildSlidesPrompt(
  educationInfo: string,
  previousOutput: string,
  sourcesBlock: string,
  slideCount: number,
  targetAudience: string,
  validationFeedback?: string
): string {
  let prompt = `${educationInfo}

## 이전 단계 결과 (수업안)
${previousOutput}
${sourcesBlock}

## 요구사항
- 슬라이드 ${slideCount}장 내외로 구성
- 교육대상(${targetAudience})에 맞는 언어와 예시 사용
- 한 슬라이드에 핵심 포인트 3-5개
- 각 슬라이드에 발표자 노트 필수 포함
- 출처가 있으면 speakerNotes에 [n] 형태로 인용
- Canva/Gamma처럼 "디자인이 적용된" 덱을 만들기 위해, 각 슬라이드에 layoutType을 반드시 포함
  - 허용 layoutType: title_slide, section_header, title_and_content, two_column, content_with_image, diagram_slide, conclusion, sources
- deckTheme를 포함해서 전체 덱의 스타일 프리셋을 명시 (style: default|minimal|creative|gamma|canva)
- content_with_image/diagram_slide의 경우, 가능한 한 image/diagram 메타데이터를 채워주세요(검색 키워드/mermaid 코드 등)

## JSON 출력 형식 (이 형식만 출력하세요)
{
  "deckTitle": "프레젠테이션 제목",
  "deckTheme": {
    "style": "gamma",
    "palette": {
      "primary": "#2563EB",
      "secondary": "#64748B",
      "background": "#FFFFFF",
      "text": "#0B1220",
      "mutedText": "#475569"
    },
    "typography": {
      "headingFont": "Malgun Gothic",
      "bodyFont": "Malgun Gothic"
    },
    "background": { "type": "gradient" }
  },
  "slides": [
    {
      "slideNumber": 1,
      "layoutType": "title_slide",
      "title": "슬라이드 제목",
      "bullets": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
      "speakerNotes": "발표자를 위한 상세 설명. 출처 인용 [1]",
      "visualHint": "이미지/다이어그램 제안 (선택)",
      "image": {
        "required": false,
        "searchKeywords": "professional modern business meeting",
        "style": "professional"
      },
      "diagram": {
        "required": false,
        "type": "flowchart",
        "mermaidCode": "flowchart TD\\n  A[Start] --> B[Step]\\n  B --> C[End]",
        "caption": "프로세스 개요"
      }
    }
  ],
  "sources": ["출처 URL 목록"]
}`;

  if (validationFeedback) {
    prompt += validationFeedback;
  }

  return prompt;
}

/**
 * 수업안 프롬프트 빌더
 */
export function buildLessonPlanPrompt(
  educationInfo: string,
  documentContent: string,
  previousOutput: string,
  sourcesBlock: string,
  sessionCount: number,
  targetAudience: string,
  validationFeedback?: string
): string {
  let prompt = `${educationInfo}

## 원본 콘텐츠
${documentContent}

## 이전 단계 결과 (커리큘럼)
${previousOutput}
${sourcesBlock}

## 요구사항
- 정확히 ${sessionCount}개 세션에 대한 수업안 작성
- 교육대상(${targetAudience})에 맞는 활동 설계
- 각 세션별 도입(5-10분), 전개(대부분), 정리(5-10분) 구조
- 구체적인 교수자 행동과 학습자 행동 명시
- 출처가 있으면 [n] 형태로 인용

## JSON 출력 형식 (이 형식만 출력하세요)
{
  "lessonPlans": [
    {
      "sessionNumber": 1,
      "title": "세션 제목",
      "duration": "120분",
      "learningObjectives": ["목표 1", "목표 2"],
      "introduction": {
        "duration": "10분",
        "activity": "도입 활동명",
        "teacherAction": "교수자 행동",
        "learnerAction": "학습자 행동"
      },
      "development": [
        {
          "duration": "30분",
          "activity": "활동명",
          "teacherAction": "교수자 행동",
          "learnerAction": "학습자 행동",
          "materials": ["필요 자료"]
        }
      ],
      "conclusion": {
        "duration": "10분",
        "activity": "정리 활동명",
        "teacherAction": "교수자 행동",
        "learnerAction": "학습자 행동"
      },
      "materials": ["전체 필요 자료"],
      "assessmentMethod": "평가 방법"
    }
  ]
}`;

  if (validationFeedback) {
    prompt += validationFeedback;
  }

  return prompt;
}

/**
 * 평가 프롬프트 빌더
 */
export function buildAssessmentPrompt(
  educationInfo: string,
  learningObjectives: string[],
  sourcesBlock: string,
  targetAudience: string,
  validationFeedback?: string
): string {
  const objectivesList = learningObjectives.map((o, i) => `${i + 1}. ${o}`).join('\n');

  let prompt = `${educationInfo}

## 학습 목표
${objectivesList}
${sourcesBlock}

## 요구사항
- 학습 목표와 연계된 평가 문항 최소 5개
- 교육대상(${targetAudience})에 맞는 난이도
- 객관식, 단답형, 서술형 등 다양한 유형 포함
- 모든 문항에 정답과 상세 해설 포함
- 난이도는 쉬움(30%), 중간(50%), 어려움(20%) 비율로 구성

## JSON 출력 형식 (이 형식만 출력하세요)
{
  "title": "평가 제목",
  "totalPoints": 100,
  "timeLimit": "30분",
  "instructions": "평가 안내문",
  "items": [
    {
      "questionNumber": 1,
      "type": "multiple_choice",
      "difficulty": "easy",
      "question": "질문 내용",
      "options": ["보기 1", "보기 2", "보기 3", "보기 4"],
      "correctAnswer": "보기 1",
      "explanation": "상세 해설",
      "relatedObjective": "연계된 학습 목표",
      "points": 10
    },
    {
      "questionNumber": 2,
      "type": "short_answer",
      "difficulty": "medium",
      "question": "단답형 질문",
      "correctAnswer": "정답",
      "explanation": "상세 해설",
      "points": 15
    }
  ]
}`;

  if (validationFeedback) {
    prompt += validationFeedback;
  }

  return prompt;
}
