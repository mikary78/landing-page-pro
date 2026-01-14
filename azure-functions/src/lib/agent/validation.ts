/**
 * 파이프라인 출력 검증 로직
 * 
 * 목적: AI 출력의 품질 검증 및 자동 수정 루프 지원
 */

import {
  BriefingInput,
  CurriculumOutput,
  LessonPlanOutput,
  SlideOutput,
  AssessmentOutput,
  PipelineContext
} from './types';

// ============================================================
// 검증 결과 인터페이스
// ============================================================

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  warnings: string[];
  suggestions: string[];
}

function createValidationResult(): ValidationResult {
  return {
    isValid: true,
    issues: [],
    warnings: [],
    suggestions: []
  };
}

// ============================================================
// 커리큘럼 검증
// ============================================================

export function validateCurriculum(
  output: CurriculumOutput | null | undefined,
  briefing: BriefingInput
): ValidationResult {
  const result = createValidationResult();

  if (!output) {
    result.isValid = false;
    result.issues.push('커리큘럼 출력이 없습니다');
    return result;
  }

  // 1. 제목 검증
  if (!output.title || output.title.trim().length < 5) {
    result.issues.push('커리큘럼 제목이 너무 짧습니다 (최소 5자)');
  }

  // 2. 세션 수 검증 (가장 중요!)
  if (!output.sessions || output.sessions.length === 0) {
    result.isValid = false;
    result.issues.push('세션이 없습니다');
  } else if (output.sessions.length !== briefing.sessionCount) {
    result.isValid = false;
    result.issues.push(
      `세션 수 불일치: 요청 ${briefing.sessionCount}개, 생성 ${output.sessions.length}개`
    );
  }

  // 3. 학습 목표 검증
  if (!output.learningObjectives || output.learningObjectives.length < 3) {
    result.warnings.push('학습 목표가 3개 미만입니다 (권장: 3-5개)');
  } else if (output.learningObjectives.length > 5) {
    result.warnings.push('학습 목표가 5개를 초과합니다 (권장: 3-5개)');
  }

  // 4. 각 세션 검증
  if (output.sessions) {
    output.sessions.forEach((session, i) => {
      const num = i + 1;
      
      // 세션 번호 순서 확인
      if (session.sessionNumber !== num) {
        result.warnings.push(`세션 ${num}의 번호가 올바르지 않습니다 (현재: ${session.sessionNumber})`);
      }
      
      // 제목 존재 확인
      if (!session.title || session.title.trim().length === 0) {
        result.issues.push(`세션 ${num}에 제목이 없습니다`);
      }
      
      // 핵심 주제 확인
      if (!session.keyTopics || session.keyTopics.length === 0) {
        result.issues.push(`세션 ${num}에 핵심 주제가 없습니다`);
      }
      
      // 기대 성과 확인
      if (!session.expectedOutcome || session.expectedOutcome.trim().length === 0) {
        result.warnings.push(`세션 ${num}에 기대 성과가 없습니다`);
      }
    });
  }

  // 5. 선수 지식 확인 (경고만)
  if (!output.prerequisites || output.prerequisites.length === 0) {
    result.warnings.push('선수 지식/요구 사항이 명시되지 않았습니다');
  }

  result.isValid = result.issues.length === 0;
  
  // 개선 제안
  if (!result.isValid) {
    result.suggestions.push(`정확히 ${briefing.sessionCount}개의 세션을 포함해야 합니다`);
    result.suggestions.push('각 세션에는 title, keyTopics, expectedOutcome이 필수입니다');
  }

  return result;
}

// ============================================================
// 수업안 검증
// ============================================================

export function validateLessonPlan(
  output: LessonPlanOutput | null | undefined,
  curriculum: CurriculumOutput | null | undefined,
  sessionNumber: number
): ValidationResult {
  const result = createValidationResult();

  if (!output) {
    result.isValid = false;
    result.issues.push(`세션 ${sessionNumber} 수업안이 없습니다`);
    return result;
  }

  // 1. 세션 번호 확인
  if (output.sessionNumber !== sessionNumber) {
    result.warnings.push(
      `세션 번호 불일치: 예상 ${sessionNumber}, 실제 ${output.sessionNumber}`
    );
  }

  // 2. 필수 구조 확인
  if (!output.introduction) {
    result.issues.push('도입(introduction) 섹션이 없습니다');
  }
  if (!output.development || output.development.length === 0) {
    result.issues.push('전개(development) 섹션이 없습니다');
  }
  if (!output.conclusion) {
    result.issues.push('정리(conclusion) 섹션이 없습니다');
  }

  // 3. 활동 블록 검증
  const validateActivityBlock = (block: any, name: string) => {
    if (!block) return;
    if (!block.duration) result.warnings.push(`${name}에 소요 시간이 없습니다`);
    if (!block.activity) result.issues.push(`${name}에 활동 내용이 없습니다`);
    if (!block.teacherAction) result.warnings.push(`${name}에 교수자 행동이 없습니다`);
    if (!block.learnerAction) result.warnings.push(`${name}에 학습자 행동이 없습니다`);
  };

  validateActivityBlock(output.introduction, '도입');
  validateActivityBlock(output.conclusion, '정리');
  output.development?.forEach((block, i) => {
    validateActivityBlock(block, `전개 ${i + 1}`);
  });

  // 4. 커리큘럼과 일관성 체크
  if (curriculum) {
    const currSession = curriculum.sessions?.find(s => s.sessionNumber === sessionNumber);
    if (currSession) {
      // 제목 유사성 체크 (엄격하지 않게)
      const currTitle = currSession.title.toLowerCase();
      const lessonTitle = output.title?.toLowerCase() || '';
      
      // 첫 단어가 같거나 주요 키워드가 포함되어 있으면 OK
      const currWords = currTitle.split(/\s+/);
      const hasOverlap = currWords.some(word => 
        word.length > 2 && lessonTitle.includes(word)
      );
      
      if (!hasOverlap && currTitle !== lessonTitle) {
        result.warnings.push(
          `수업안 제목이 커리큘럼과 다릅니다: 커리큘럼 "${currSession.title}" vs 수업안 "${output.title}"`
        );
      }
    }
  }

  result.isValid = result.issues.length === 0;
  return result;
}

// ============================================================
// 슬라이드 검증
// ============================================================

export function validateSlides(
  output: SlideOutput | null | undefined,
  expectedSlideCount: number
): ValidationResult {
  const result = createValidationResult();

  if (!output) {
    result.isValid = false;
    result.issues.push('슬라이드 출력이 없습니다');
    return result;
  }

  // 1. 덱 제목 확인
  if (!output.deckTitle || output.deckTitle.trim().length === 0) {
    result.warnings.push('슬라이드 덱 제목이 없습니다');
  }

  // 2. 슬라이드 배열 확인
  if (!output.slides || output.slides.length === 0) {
    result.isValid = false;
    result.issues.push('슬라이드가 없습니다');
    return result;
  }

  // 3. 슬라이드 수 적정성 체크
  const minSlides = Math.max(5, expectedSlideCount - 3);
  const maxSlides = expectedSlideCount + 5;
  
  if (output.slides.length < minSlides) {
    result.warnings.push(`슬라이드가 너무 적습니다 (${output.slides.length}장, 권장: ${minSlides}-${maxSlides}장)`);
  } else if (output.slides.length > maxSlides) {
    result.warnings.push(`슬라이드가 너무 많습니다 (${output.slides.length}장, 권장: ${minSlides}-${maxSlides}장)`);
  }

  // 4. 개별 슬라이드 검증
  output.slides.forEach((slide, i) => {
    const num = i + 1;
    
    if (!slide.title || slide.title.trim().length === 0) {
      result.issues.push(`슬라이드 ${num}에 제목이 없습니다`);
    }
    
    if (!slide.bullets || slide.bullets.length === 0) {
      result.warnings.push(`슬라이드 ${num}에 내용(bullets)이 없습니다`);
    } else if (slide.bullets.length > 6) {
      result.warnings.push(
        `슬라이드 ${num}의 내용이 너무 많습니다 (${slide.bullets.length}개, 권장: 6개 이하)`
      );
    }
    
    if (!slide.speakerNotes || slide.speakerNotes.trim().length === 0) {
      result.warnings.push(`슬라이드 ${num}에 발표자 노트가 없습니다`);
    }

    // 5. Canva/Gamma 스타일 레이아웃 타입 검증 (optional이지만 있으면 검사)
    const lt = (slide as any)?.layoutType;
    const allowed = new Set([
      'title_slide',
      'section_header',
      'title_and_content',
      'two_column',
      'content_with_image',
      'diagram_slide',
      'conclusion',
      'sources',
    ]);
    if (lt !== undefined && typeof lt !== 'string') {
      result.warnings.push(`슬라이드 ${num}의 layoutType이 문자열이 아닙니다`);
    } else if (typeof lt === 'string' && !allowed.has(lt)) {
      result.warnings.push(`슬라이드 ${num}의 layoutType 값이 허용 목록에 없습니다: ${lt}`);
    }
  });

  result.isValid = result.issues.length === 0;
  return result;
}

// ============================================================
// 평가 검증
// ============================================================

export function validateAssessment(
  output: AssessmentOutput | null | undefined,
  learningObjectives: string[]
): ValidationResult {
  const result = createValidationResult();

  if (!output) {
    result.isValid = false;
    result.issues.push('평가 출력이 없습니다');
    return result;
  }

  // 1. 문항 배열 확인
  if (!output.items || output.items.length === 0) {
    result.isValid = false;
    result.issues.push('평가 문항이 없습니다');
    return result;
  }

  // 2. 최소 문항 수 체크 (학습 목표 수 기반)
  const minQuestions = Math.max(5, learningObjectives.length);
  if (output.items.length < minQuestions) {
    result.warnings.push(`평가 문항이 너무 적습니다 (${output.items.length}개, 권장: 최소 ${minQuestions}개)`);
  }

  // 3. 개별 문항 검증
  let multipleChoiceCount = 0;
  let shortAnswerCount = 0;
  let totalPoints = 0;

  output.items.forEach((item, i) => {
    const num = i + 1;
    
    if (!item.question || item.question.trim().length === 0) {
      result.issues.push(`문항 ${num}에 질문이 없습니다`);
    }
    
    if (!item.correctAnswer || (typeof item.correctAnswer === 'string' && item.correctAnswer.trim().length === 0)) {
      result.issues.push(`문항 ${num}에 정답이 없습니다`);
    }
    
    if (item.type === 'multiple_choice') {
      multipleChoiceCount++;
      if (!item.options || item.options.length < 3) {
        result.warnings.push(`문항 ${num} (객관식)에 선택지가 부족합니다`);
      }
    } else if (item.type === 'short_answer') {
      shortAnswerCount++;
    }
    
    if (!item.explanation || item.explanation.trim().length === 0) {
      result.warnings.push(`문항 ${num}에 해설이 없습니다`);
    }
    
    totalPoints += item.points || 0;
  });

  // 4. 문항 유형 다양성 체크
  if (output.items.length > 3 && multipleChoiceCount === output.items.length) {
    result.warnings.push('모든 문항이 객관식입니다. 다양한 유형을 포함하세요.');
  }

  // 5. 총점 검증
  if (output.totalPoints && Math.abs(output.totalPoints - totalPoints) > 1) {
    result.warnings.push(
      `총점 불일치: 명시된 ${output.totalPoints}점 vs 계산된 ${totalPoints}점`
    );
  }

  result.isValid = result.issues.length === 0;
  return result;
}

// ============================================================
// 단계 간 일관성 체크
// ============================================================

export function checkPipelineConsistency(
  context: PipelineContext
): ValidationResult {
  const result = createValidationResult();
  const { briefing, curriculum, lessonPlans, slides, assessment } = context;

  // 1. 커리큘럼 → 수업안 일관성
  if (curriculum && lessonPlans) {
    const curriculumSessionCount = curriculum.sessions?.length || 0;
    const lessonPlanCount = lessonPlans.length;
    
    if (curriculumSessionCount !== lessonPlanCount) {
      result.issues.push(
        `커리큘럼 세션(${curriculumSessionCount}개)과 수업안(${lessonPlanCount}개) 수가 일치하지 않습니다`
      );
    }
    
    // 세션 제목 매칭 체크
    curriculum.sessions?.forEach((currSession, i) => {
      const lessonPlan = lessonPlans[i];
      if (lessonPlan && currSession.sessionNumber !== lessonPlan.sessionNumber) {
        result.warnings.push(
          `세션 ${i + 1} 번호가 일치하지 않습니다`
        );
      }
    });
  }

  // 2. 커리큘럼 → 평가 일관성
  if (curriculum && assessment) {
    const objectives = curriculum.learningObjectives || [];
    const questions = assessment.items || [];
    
    // 학습 목표당 최소 1개 문항 권장
    if (objectives.length > 0 && questions.length < objectives.length) {
      result.warnings.push(
        `학습 목표(${objectives.length}개) 대비 평가 문항(${questions.length}개)이 부족합니다`
      );
    }
  }

  // 3. 세션 수와 슬라이드 분량 체크
  if (curriculum && slides) {
    const sessionCount = curriculum.sessions?.length || 1;
    const slideCount = slides.slides?.length || 0;
    const minSlides = sessionCount * 3;  // 세션당 최소 3장
    const maxSlides = sessionCount * 8;  // 세션당 최대 8장
    
    if (slideCount < minSlides) {
      result.warnings.push(
        `슬라이드가 부족합니다 (${slideCount}장, 권장 최소: ${minSlides}장)`
      );
    } else if (slideCount > maxSlides) {
      result.warnings.push(
        `슬라이드가 너무 많습니다 (${slideCount}장, 권장 최대: ${maxSlides}장)`
      );
    }
  }

  result.isValid = result.issues.length === 0;
  return result;
}

// ============================================================
// 검증 피드백 생성 (재생성 프롬프트용)
// ============================================================

export function generateValidationFeedback(
  validation: ValidationResult,
  stage: string
): string {
  if (validation.isValid && validation.warnings.length === 0) {
    return '';
  }

  let feedback = `\n## ⚠️ 이전 생성 결과의 문제점 (${stage})\n`;
  
  if (validation.issues.length > 0) {
    feedback += `\n### 필수 수정 사항:\n`;
    validation.issues.forEach(issue => {
      feedback += `- ❌ ${issue}\n`;
    });
  }
  
  if (validation.warnings.length > 0) {
    feedback += `\n### 권장 수정 사항:\n`;
    validation.warnings.forEach(warning => {
      feedback += `- ⚠️ ${warning}\n`;
    });
  }
  
  if (validation.suggestions.length > 0) {
    feedback += `\n### 개선 제안:\n`;
    validation.suggestions.forEach(suggestion => {
      feedback += `- 💡 ${suggestion}\n`;
    });
  }
  
  feedback += `\n위 문제점을 해결하여 다시 생성해주세요.\n`;
  
  return feedback;
}
