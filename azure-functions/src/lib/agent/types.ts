/**
 * 파이프라인 구조화된 타입 정의
 * 
 * 목적: AI 출력의 구조화 및 단계 간 컨텍스트 체이닝 개선
 * 
 * 참고자료:
 * - Bloom's Taxonomy: https://en.wikipedia.org/wiki/Bloom%27s_taxonomy
 * - ADDIE Model: https://en.wikipedia.org/wiki/ADDIE_Model
 */

// ============================================================
// 입력 타입 정의
// ============================================================

/** 교육대상 분류 */
export type TargetAudienceType =
  | 'elementary'      // 초등학생 (7-12세)
  | 'middle_school'   // 중학생 (13-15세)
  | 'high_school'     // 고등학생 (16-18세)
  | 'university'      // 대학생/대학원생
  | 'job_seeker'      // 취업준비생
  | 'office_worker'   // 직장인 (사무직)
  | 'manager'         // 관리자/리더
  | 'professional'    // 전문직
  | 'self_employed'   // 자영업자/소상공인
  | 'public_servant'  // 공무원
  | 'educator'        // 교사/교육자
  | 'general_adult'   // 일반 성인
  | 'senior';         // 시니어 (60세 이상)

/** 교육과정 수준 */
export type CourseLevelType =
  | '입문과정'
  | '기본과정'
  | '심화과정'
  | '실무과정'
  | '전문가과정';

/** 브리핑 입력 (사용자가 입력한 교육 설정) */
export interface BriefingInput {
  topic: string;
  description?: string;
  targetAudience: TargetAudienceType | string;
  totalDuration: string;           // e.g., "2시간"
  sessionCount: number;            // e.g., 1, 2, 3...
  courseLevel: CourseLevelType | string;
  specialRequirements?: string;
  documentContent?: string;        // 원본 문서 내용
}

// ============================================================
// 커리큘럼 설계 출력
// ============================================================

/** 세션(회차) 계획 */
export interface SessionPlan {
  sessionNumber: number;
  title: string;
  duration: string;
  keyTopics: string[];
  learningObjectives: string[];
  expectedOutcome: string;
}

/** 커리큘럼 설계 출력 */
export interface CurriculumOutput {
  title: string;
  totalDuration: string;
  targetAudienceAnalysis: string;
  learningObjectives: string[];      // 전체 학습 목표 (3-5개)
  sessions: SessionPlan[];
  prerequisites: string[];
  assessmentStrategy: string;
}

// ============================================================
// 수업안 출력
// ============================================================

/** 활동 블록 */
export interface ActivityBlock {
  duration: string;                  // e.g., "10분"
  activity: string;                  // 활동명
  teacherAction: string;             // 교수자 행동
  learnerAction: string;             // 학습자 행동
  materials?: string[];              // 필요 자료
}

/** 수업안 출력 (세션당 1개) */
export interface LessonPlanOutput {
  sessionNumber: number;
  title: string;
  duration: string;
  learningObjectives: string[];
  introduction: ActivityBlock;       // 도입
  development: ActivityBlock[];      // 전개 (여러 활동)
  conclusion: ActivityBlock;         // 정리
  materials: string[];
  assessmentMethod: string;
  homeAssignment?: string;
}

// ============================================================
// 슬라이드 출력
// ============================================================

/** 개별 슬라이드 */
export interface Slide {
  slideNumber: number;
  title: string;
  bullets: string[];
  speakerNotes: string;
  visualHint?: string;
  citations?: string[];              // [1], [2] 형태
  /**
   * Canva/Gamma 스타일 레이아웃 타입(선택)
   * - 기존 출력과의 호환을 위해 optional
   */
  layoutType?:
    | 'title_slide'
    | 'section_header'
    | 'title_and_content'
    | 'two_column'
    | 'content_with_image'
    | 'diagram_slide'
    | 'conclusion'
    | 'sources';

  /** 이미지/다이어그램 메타(선택) - 실제 렌더러가 있으면 사용 */
  image?: {
    required?: boolean;
    searchKeywords?: string; // 영문 키워드 권장(Unsplash/Pexels 등)
    style?: 'professional' | 'modern' | 'minimalist' | 'creative';
  };
  diagram?: {
    required?: boolean;
    type?: 'flowchart' | 'sequence' | 'class' | 'er' | 'gantt' | 'pie';
    mermaidCode?: string;
    caption?: string;
  };
}

/** 슬라이드 덱 출력 */
export interface SlideOutput {
  deckTitle: string;
  sessionNumber?: number;
  slides: Slide[];
  /**
   * 출처
   * - Plan B 이후: deck-level sources가 표준화(객체 배열)될 수 있으므로 유연하게 허용
   */
  sources: any[];                 // string[] 또는 {id,title?,url}[] (legacy/backward compatible)

  /** 덱 테마/디자인 토큰(선택) */
  deckTheme?: {
    /**
     * 프론트(PPTX/Canvas)에서 해석할 스타일 프리셋
     * - optional: 기존 덱은 없음
     */
    style?: 'default' | 'minimal' | 'creative' | 'gamma' | 'canva';
    palette?: {
      primary?: string;  // hex
      secondary?: string; // hex
      background?: string; // hex
      text?: string; // hex
      mutedText?: string; // hex
    };
    typography?: {
      headingFont?: string;
      bodyFont?: string;
    };
    background?: {
      type?: 'solid' | 'gradient' | 'image';
    };
  };
}

// ============================================================
// 실습 템플릿 출력
// ============================================================

/** 실습 단계 */
export interface LabStep {
  stepNumber: number;
  title: string;
  duration: string;
  instructions: string[];
  expectedResult: string;
  commonErrors?: string[];
  tips?: string[];
}

/** 실습 템플릿 출력 */
export interface LabTemplateOutput {
  title: string;
  sessionNumber?: number;
  overview: string;
  objectives: string[];
  prerequisites: string[];
  materials: string[];
  steps: LabStep[];
  successCriteria: string[];
  extensionActivities?: string[];
}

// ============================================================
// 평가/퀴즈 출력
// ============================================================

/** 평가 문항 */
export interface AssessmentItem {
  questionNumber: number;
  type: 'multiple_choice' | 'short_answer' | 'practical' | 'essay';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options?: string[];                // 객관식 선택지
  correctAnswer: string;
  explanation: string;
  relatedObjective?: string;         // 연계된 학습 목표
  points: number;
}

/** 평가/퀴즈 출력 */
export interface AssessmentOutput {
  title: string;
  sessionNumber?: number;
  totalPoints: number;
  timeLimit?: string;
  instructions: string;
  items: AssessmentItem[];
  answerKey: {
    questionNumber: number;
    answer: string;
    explanation: string;
  }[];
}

// ============================================================
// 최종 검토 출력
// ============================================================

/** 최종 검토 출력 */
export interface FinalReviewOutput {
  title: string;
  executiveSummary: string;
  curriculumOverview: string;
  sessionSummaries: {
    sessionNumber: number;
    title: string;
    keyPoints: string[];
  }[];
  materialsList: string[];
  implementationNotes: string[];
  qualityCheckResults: {
    category: string;
    status: 'pass' | 'warning' | 'fail';
    note?: string;
  }[];
}

// ============================================================
// 파이프라인 컨텍스트 (단계 간 데이터 전달)
// ============================================================

export interface WebSearchResult {
  url: string;
  title: string;
  snippet?: string;
}

/** 파이프라인 전체 컨텍스트 */
export interface PipelineContext {
  // 입력
  briefing: BriefingInput;
  
  // 웹 검색 결과
  webSearchResults?: WebSearchResult[];
  
  // 각 단계 출력 (JSON 구조화)
  curriculum?: CurriculumOutput;
  lessonPlans?: LessonPlanOutput[];
  slides?: SlideOutput;
  labTemplate?: LabTemplateOutput;
  assessment?: AssessmentOutput;
  finalReview?: FinalReviewOutput;
  
  // 레거시 호환 (Markdown 문자열)
  rawOutputs?: {
    curriculum?: string;
    lessonPlan?: string;
    slides?: string;
    labTemplate?: string;
    assessment?: string;
  };
}

// ============================================================
// JSON 스키마 정의 (AI 출력 강제)
// ============================================================

/** 커리큘럼 JSON 스키마 */
export const CURRICULUM_JSON_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "커리큘럼 제목" },
    totalDuration: { type: "string", description: "총 교육 시간 (예: 8시간)" },
    targetAudienceAnalysis: { type: "string", description: "대상 학습자 분석" },
    learningObjectives: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 5,
      description: "전체 학습 목표 (3-5개)"
    },
    sessions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sessionNumber: { type: "integer" },
          title: { type: "string" },
          duration: { type: "string" },
          keyTopics: { type: "array", items: { type: "string" } },
          learningObjectives: { type: "array", items: { type: "string" } },
          expectedOutcome: { type: "string" }
        },
        required: ["sessionNumber", "title", "duration", "keyTopics", "expectedOutcome"]
      },
      description: "세션별 계획"
    },
    prerequisites: {
      type: "array",
      items: { type: "string" },
      description: "선수 지식/요구 사항"
    },
    assessmentStrategy: { type: "string", description: "평가 전략" }
  },
  required: ["title", "totalDuration", "learningObjectives", "sessions"]
};

/** 수업안 JSON 스키마 */
export const LESSON_PLAN_JSON_SCHEMA = {
  type: "object",
  properties: {
    sessionNumber: { type: "integer" },
    title: { type: "string" },
    duration: { type: "string" },
    learningObjectives: { type: "array", items: { type: "string" } },
    introduction: {
      type: "object",
      properties: {
        duration: { type: "string" },
        activity: { type: "string" },
        teacherAction: { type: "string" },
        learnerAction: { type: "string" }
      },
      required: ["duration", "activity", "teacherAction", "learnerAction"]
    },
    development: {
      type: "array",
      items: {
        type: "object",
        properties: {
          duration: { type: "string" },
          activity: { type: "string" },
          teacherAction: { type: "string" },
          learnerAction: { type: "string" },
          materials: { type: "array", items: { type: "string" } }
        },
        required: ["duration", "activity", "teacherAction", "learnerAction"]
      }
    },
    conclusion: {
      type: "object",
      properties: {
        duration: { type: "string" },
        activity: { type: "string" },
        teacherAction: { type: "string" },
        learnerAction: { type: "string" }
      },
      required: ["duration", "activity", "teacherAction", "learnerAction"]
    },
    materials: { type: "array", items: { type: "string" } },
    assessmentMethod: { type: "string" }
  },
  required: ["sessionNumber", "title", "duration", "introduction", "development", "conclusion"]
};

/** 슬라이드 JSON 스키마 */
export const SLIDES_JSON_SCHEMA = {
  type: "object",
  properties: {
    deckTitle: { type: "string" },
    sessionNumber: { type: "integer" },
    slides: {
      type: "array",
      items: {
        type: "object",
        properties: {
          slideNumber: { type: "integer" },
          title: { type: "string" },
          bullets: { type: "array", items: { type: "string" }, maxItems: 6 },
          speakerNotes: { type: "string" },
          visualHint: { type: "string" },
          citations: { type: "array", items: { type: "string" } }
        },
        required: ["slideNumber", "title", "bullets", "speakerNotes"]
      }
    },
    sources: { type: "array", items: { type: "string" } }
  },
  required: ["deckTitle", "slides"]
};

/** 평가 JSON 스키마 */
export const ASSESSMENT_JSON_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    totalPoints: { type: "integer" },
    timeLimit: { type: "string" },
    instructions: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          questionNumber: { type: "integer" },
          type: { type: "string", enum: ["multiple_choice", "short_answer", "practical", "essay"] },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          correctAnswer: { type: "string" },
          explanation: { type: "string" },
          points: { type: "integer" }
        },
        required: ["questionNumber", "type", "question", "correctAnswer", "explanation", "points"]
      }
    }
  },
  required: ["title", "totalPoints", "items"]
};
