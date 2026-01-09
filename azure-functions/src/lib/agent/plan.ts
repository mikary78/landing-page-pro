export type OutputType = 'document' | 'infographic' | 'slides';

export type GenerationStepType =
  | 'interpret'
  | 'web_search'
  | 'generate_document'
  | 'generate_infographic'
  | 'generate_slides'
  | 'design_assets'
  // Chat-driven revisions (added dynamically by generation/chat)
  | 'revise_document'
  | 'revise_infographic'
  | 'revise_slides';

export interface GenerationOptions {
  enableWebSearch?: boolean;
  enableImageGeneration?: boolean;
}

export interface RequestedOutputs {
  document?: boolean;
  infographic?: boolean;
  slides?: boolean;
}

export interface PlannedStep {
  stepType: GenerationStepType;
  title: string;
}

/**
 * 선택된 산출물/옵션 기반으로 실행 단계(plan)를 결정합니다.
 * - 순서는 UI(좌측 패널)와 백엔드 worker 처리 순서의 “단일 진실”입니다.
 */
export function planGenerationSteps(
  outputs: RequestedOutputs,
  options: GenerationOptions
): PlannedStep[] {
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

