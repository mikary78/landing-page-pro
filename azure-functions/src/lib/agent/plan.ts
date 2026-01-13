export type OutputType = 'document' | 'infographic' | 'slides';

/**
 * 6단계 파이프라인 (기존 시스템과 호환)
 * 1. curriculum_design - 커리큘럼 설계
 * 2. lesson_plan - 수업안 작성
 * 3. slides - 슬라이드 구성
 * 4. lab_template - 실습 템플릿
 * 5. assessment - 평가/퀴즈
 * 6. final_review - 최종 검토
 */
export type GenerationStepType =
  | 'interpret'
  | 'web_search'
  // 6단계 파이프라인
  | 'curriculum_design'
  | 'lesson_plan'
  | 'slides'
  | 'lab_template'
  | 'assessment'
  | 'final_review'
  // Legacy (하위 호환)
  | 'generate_document'
  | 'generate_infographic'
  | 'generate_slides'
  | 'design_assets'
  // Chat-driven revisions
  | 'revise_document'
  | 'revise_infographic'
  | 'revise_slides';

export interface GenerationOptions {
  enableWebSearch?: boolean;
  enableImageGeneration?: boolean;
  /** 6단계 파이프라인 사용 여부 (기본: true) */
  useSixStagePipeline?: boolean;
  /**
   * 슬라이드 생성 옵션 (선택)
   * - slideCount: 3~15 권장 (PRD 기준)
   * - template: PPTX 내보내기/디자인 톤에 활용
   */
  slides?: {
    slideCount?: number;
    template?: 'default' | 'minimal' | 'creative';
  };
}

export interface RequestedOutputs {
  document?: boolean;
  infographic?: boolean;
  slides?: boolean;
}

export interface PlannedStep {
  stepType: GenerationStepType;
  title: string;
  estimatedMinutes?: number;
}

/**
 * 선택된 산출물/옵션 기반으로 실행 단계(plan)를 결정합니다.
 * 
 * 기본적으로 6단계 파이프라인을 사용합니다:
 * 1. 커리큘럼 설계 (~2분)
 * 2. 수업안 작성 (~3분)
 * 3. 슬라이드 구성 (~3분)
 * 4. 실습 템플릿 (~2분)
 * 5. 평가/퀴즈 (~2분)
 * 6. 최종 검토 (~1분)
 */
export function planGenerationSteps(
  outputs: RequestedOutputs,
  options: GenerationOptions
): PlannedStep[] {
  // 6단계 파이프라인 (기본값: true)
  const useSixStage = options.useSixStagePipeline !== false;

  if (useSixStage) {
    const steps: PlannedStep[] = [];

    // 웹 검색 (선택적)
    if (options.enableWebSearch) {
      steps.push({ stepType: 'web_search', title: '웹 검색(최신 내용 반영)', estimatedMinutes: 1 });
    }

    // 6단계 파이프라인 (항상 모든 단계 실행)
    steps.push(
      { stepType: 'curriculum_design', title: '커리큘럼 설계', estimatedMinutes: 2 },
      { stepType: 'lesson_plan', title: '수업안 작성', estimatedMinutes: 3 },
      { stepType: 'slides', title: '슬라이드 구성', estimatedMinutes: 3 },
      { stepType: 'lab_template', title: '실습 템플릿', estimatedMinutes: 2 },
      { stepType: 'assessment', title: '평가/퀴즈', estimatedMinutes: 2 },
      { stepType: 'final_review', title: '최종 검토', estimatedMinutes: 1 }
    );

    // 인포그래픽 생성 (선택적)
    if (outputs.infographic) {
      steps.push({ stepType: 'generate_infographic', title: '인포그래픽 생성', estimatedMinutes: 2 });
    }

    // 이미지/디자인 에셋 생성 (선택적)
    if (options.enableImageGeneration && (outputs.infographic || outputs.slides || outputs.document)) {
      steps.push({ stepType: 'design_assets', title: '디자인/삽화 생성(이미지)', estimatedMinutes: 2 });
    }

    return steps;
  }

  // Legacy: 기존 산출물 기반 파이프라인
  const steps: PlannedStep[] = [
    { stepType: 'interpret', title: '입력 내용 해석' },
  ];

  if (options.enableWebSearch) {
    steps.push({ stepType: 'web_search', title: '웹 검색(최신 내용 반영)' });
  }

  if (outputs.document) {
    steps.push({ stepType: 'generate_document', title: '강의안(문서) 생성' });
  }
  if (outputs.infographic) {
    steps.push({ stepType: 'generate_infographic', title: '인포그래픽 생성' });
  }
  if (outputs.slides) {
    steps.push({ stepType: 'generate_slides', title: '교안 슬라이드 생성' });
  }

  if (options.enableImageGeneration && (outputs.infographic || outputs.slides || outputs.document)) {
    steps.push({ stepType: 'design_assets', title: '디자인/삽화 생성(이미지)' });
  }

  return steps;
}
