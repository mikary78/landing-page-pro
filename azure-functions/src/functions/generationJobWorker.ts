/**
 * Generation Job Worker (Storage Queue Trigger)
 *
 * 주의:
 * - 로컬 개발은 Azurite Queue를 사용합니다(AzureWebJobsStorage).
 *
 * 참고자료(외부):
 * - Azure Functions Node.js v4 Storage Queue trigger 예제:
 *   https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-queue-trigger
 */

import { app, InvocationContext, output } from '@azure/functions';
import { transaction } from '../lib/database';
import { generateContent } from '../lib/ai-services';
import { planGenerationSteps, RequestedOutputs, GenerationOptions, GenerationStepType } from '../lib/agent/plan';
import { resolveSlideCount, resolveTemplate } from '../lib/agent/slidesOptions';
import { webSearch, WebSearchResult } from '../lib/web-search';
import { generateImageDataUrl } from '../lib/image-generation';
import { ensureSourcesSectionMarkdown, enforceSlideCitationsAndDeckSources, normalizeSources } from '../lib/citations';
import {
  BriefingInput,
  CurriculumOutput,
  LessonPlanOutput,
  SlideOutput,
  AssessmentOutput,
  PipelineContext,
} from '../lib/agent/types';
import {
  validateCurriculum,
  validateLessonPlan,
  validateSlides,
  validateAssessment,
  generateValidationFeedback,
} from '../lib/agent/validation';
import {
  STAGE_PERSONAS,
  getTargetAudienceGuide,
  buildCurriculumPrompt,
} from '../lib/agent/prompts';
import {
  generateWithRetry,
  buildSlidesPrompt,
  buildLessonPlanPrompt,
  buildAssessmentPrompt,
} from '../lib/agent/generator';

const jobQueueOutput = output.storageQueue({
  queueName: 'generation-jobs',
  connection: 'AzureWebJobsStorage',
});

interface JobQueueMessage {
  jobId: string;
}

function safeJsonParse<T>(value: any): T | null {
  try {
    if (typeof value === 'string') {
      // JSON 코드블록 제거 (```json ... ```)
      let cleaned = value.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(7);
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3);
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3);
      }
      return JSON.parse(cleaned.trim()) as T;
    }
    return value as T;
  } catch {
    return null;
  }
}

/**
 * CurriculumOutput JSON을 Markdown으로 변환
 */
function convertCurriculumToMarkdown(curriculum: CurriculumOutput): string {
  let md = `# ${curriculum.title}\n\n`;
  md += `**총 교육 시간**: ${curriculum.totalDuration}\n\n`;
  
  if (curriculum.targetAudienceAnalysis) {
    md += `## 대상 학습자 분석\n${curriculum.targetAudienceAnalysis}\n\n`;
  }
  
  md += `## 학습 목표\n`;
  curriculum.learningObjectives.forEach((obj, i) => {
    md += `${i + 1}. ${obj}\n`;
  });
  md += '\n';
  
  md += `## 커리큘럼 구성\n\n`;
  md += `| 회차 | 세션 제목 | 시간 | 핵심 주제 | 기대 성과 |\n`;
  md += `|------|----------|------|----------|----------|\n`;
  curriculum.sessions.forEach(session => {
    const topics = session.keyTopics?.join(', ') || '';
    md += `| ${session.sessionNumber} | ${session.title} | ${session.duration} | ${topics} | ${session.expectedOutcome || ''} |\n`;
  });
  md += '\n';
  
  // 세션별 상세 정보
  md += `## 세션별 상세 내용\n\n`;
  curriculum.sessions.forEach(session => {
    md += `### 세션 ${session.sessionNumber}: ${session.title}\n`;
    md += `- **시간**: ${session.duration}\n`;
    if (session.learningObjectives?.length) {
      md += `- **학습 목표**: ${session.learningObjectives.join(', ')}\n`;
    }
    md += `- **핵심 주제**: ${session.keyTopics?.join(', ') || ''}\n`;
    md += `- **기대 성과**: ${session.expectedOutcome || ''}\n\n`;
  });
  
  if (curriculum.prerequisites?.length) {
    md += `## 선수 지식/요구 사항\n`;
    curriculum.prerequisites.forEach(prereq => {
      md += `- ${prereq}\n`;
    });
    md += '\n';
  }
  
  if (curriculum.assessmentStrategy) {
    md += `## 평가 전략\n${curriculum.assessmentStrategy}\n`;
  }
  
  return md;
}

/**
 * LessonPlanOutput[] JSON을 Markdown으로 변환
 */
function convertLessonPlansToMarkdown(lessonPlans: LessonPlanOutput[]): string {
  let md = `# 수업안\n\n`;
  
  lessonPlans.forEach(plan => {
    md += `## 세션 ${plan.sessionNumber}: ${plan.title}\n\n`;
    md += `**시간**: ${plan.duration}\n\n`;
    
    if (plan.learningObjectives?.length) {
      md += `### 학습 목표\n`;
      plan.learningObjectives.forEach(obj => {
        md += `- ${obj}\n`;
      });
      md += '\n';
    }
    
    // 도입
    if (plan.introduction) {
      md += `### 도입 (${plan.introduction.duration})\n`;
      md += `- **활동**: ${plan.introduction.activity}\n`;
      md += `- **교수자**: ${plan.introduction.teacherAction}\n`;
      md += `- **학습자**: ${plan.introduction.learnerAction}\n\n`;
    }
    
    // 전개
    if (plan.development?.length) {
      md += `### 전개\n`;
      plan.development.forEach((dev, i) => {
        md += `#### 활동 ${i + 1}: ${dev.activity} (${dev.duration})\n`;
        md += `- **교수자**: ${dev.teacherAction}\n`;
        md += `- **학습자**: ${dev.learnerAction}\n`;
        if (dev.materials?.length) {
          md += `- **자료**: ${dev.materials.join(', ')}\n`;
        }
        md += '\n';
      });
    }
    
    // 정리
    if (plan.conclusion) {
      md += `### 정리 (${plan.conclusion.duration})\n`;
      md += `- **활동**: ${plan.conclusion.activity}\n`;
      md += `- **교수자**: ${plan.conclusion.teacherAction}\n`;
      md += `- **학습자**: ${plan.conclusion.learnerAction}\n\n`;
    }
    
    // 준비물
    if (plan.materials?.length) {
      md += `### 필요 자료\n`;
      plan.materials.forEach(mat => {
        md += `- ${mat}\n`;
      });
      md += '\n';
    }
    
    // 평가 방법
    if (plan.assessmentMethod) {
      md += `### 평가 방법\n${plan.assessmentMethod}\n\n`;
    }
    
    md += '---\n\n';
  });
  
  return md;
}

/**
 * SlideOutput JSON을 Markdown으로 변환
 */
function convertSlidesToMarkdown(slides: SlideOutput): string {
  let md = `# ${slides.deckTitle}\n\n`;
  
  if (slides.slides?.length) {
    slides.slides.forEach((slide, i) => {
      md += `## 슬라이드 ${i + 1}: ${slide.title}\n\n`;
      
      if (slide.bullets?.length) {
        slide.bullets.forEach(bullet => {
          md += `- ${bullet}\n`;
        });
        md += '\n';
      }
      
      if (slide.speakerNotes) {
        md += `> **발표자 노트**: ${slide.speakerNotes}\n\n`;
      }
      
      if (slide.visualHint) {
        md += `*시각 자료 제안: ${slide.visualHint}*\n\n`;
      }
    });
  }
  
  if (slides.sources?.length) {
    md += `## 출처\n`;
    slides.sources.forEach((source, i) => {
      md += `${i + 1}. ${source}\n`;
    });
  }
  
  return md;
}

/**
 * AssessmentOutput JSON을 Markdown으로 변환
 */
function convertAssessmentToMarkdown(assessment: AssessmentOutput): string {
  let md = `# ${assessment.title}\n\n`;
  
  md += `**총점**: ${assessment.totalPoints}점\n`;
  if (assessment.timeLimit) {
    md += `**제한 시간**: ${assessment.timeLimit}\n`;
  }
  md += '\n';
  
  if (assessment.instructions) {
    md += `## 안내\n${assessment.instructions}\n\n`;
  }
  
  if (assessment.items?.length) {
    md += `## 문항\n\n`;
    assessment.items.forEach(item => {
      const typeLabel = {
        multiple_choice: '객관식',
        short_answer: '단답형',
        practical: '실습형',
        essay: '서술형',
      }[item.type] || item.type;
      
      const diffLabel = {
        easy: '쉬움',
        medium: '보통',
        hard: '어려움',
      }[item.difficulty] || item.difficulty;
      
      md += `### ${item.questionNumber}. ${item.question}\n`;
      md += `*[${typeLabel}, ${diffLabel}, ${item.points}점]*\n\n`;
      
      if (item.options?.length) {
        item.options.forEach((opt, i) => {
          const marker = opt === item.correctAnswer ? '✓' : ' ';
          md += `${marker} ${String.fromCharCode(65 + i)}. ${opt}\n`;
        });
        md += '\n';
      }
      
      md += `**정답**: ${item.correctAnswer}\n\n`;
      md += `**해설**: ${item.explanation}\n\n`;
    });
  }
  
  return md;
}

interface ProjectContext {
  title: string;
  description: string;
  educationTarget: string | null;
  educationDuration: string;
  educationCourse: string;
  educationSession: number | null;
}

// 교육대상 레이블 매핑
const EDUCATION_TARGET_LABELS: Record<string, string> = {
  elementary: '초등학생 (7-12세)',
  middle_school: '중학생 (13-15세)',
  high_school: '고등학생 (16-18세)',
  university: '대학생/대학원생',
  job_seeker: '취업준비생',
  office_worker: '직장인 (사무직)',
  manager: '관리자/리더',
  professional: '전문직 (의사, 변호사, 회계사 등)',
  self_employed: '자영업자/소상공인',
  public_servant: '공무원',
  educator: '교사/교육자',
  general_adult: '일반 성인',
  senior: '시니어 (60세 이상)',
};

async function runStep(
  stepType: GenerationStepType,
  aiModel: 'gemini' | 'claude' | 'chatgpt',
  projectId: string,
  documentContent: string,
  options: GenerationOptions,
  stepInput: any,
  contextState: { interpret?: any; web?: { queries: string[]; results: WebSearchResult[] } },
  existingArtifacts: { infographic?: any; slides?: any },
  context: InvocationContext,
  projectContext?: ProjectContext
): Promise<{
  output?: any;
  log?: string;
  artifacts?: Array<{
    type: 'document' | 'infographic' | 'slides';
    contentText?: string;
    contentJson?: any;
    assets?: any;
    markCompleted?: boolean;
  }>;
}> {

  if (stepType === 'interpret') {
    // 교육대상 레이블 변환
    const targetLabel = projectContext?.educationTarget 
      ? EDUCATION_TARGET_LABELS[projectContext.educationTarget] || projectContext.educationTarget 
      : '미지정';

    // 교육 설정 정보 구성
    const educationInfo = projectContext ? `
교육 설정:
- 프로젝트 제목: ${projectContext.title || '미지정'}
- 설명: ${projectContext.description || '미지정'}
- 교육대상: ${targetLabel}
- 교육 시간: ${projectContext?.educationDuration || '미지정'}
- 교육 과정: ${projectContext?.educationCourse || '미지정'}
- 회차: ${projectContext?.educationSession ? `${projectContext.educationSession}회차` : '미지정'}
` : '';

    const system = `당신은 교육 콘텐츠 제작용 에이전트입니다. 사용자의 입력과 교육 설정을 분석해 핵심 목표/대상/제약/산출물별 요구사항을 구조화된 JSON으로 정리하세요.
특히 교육 시간과 회차 정보를 반영하여 적절한 분량과 깊이의 콘텐츠를 계획하세요.
출력은 JSON만 반환하세요.`;
    const prompt = `프로젝트ID: ${projectId}
${educationInfo}
사용자 입력:
${documentContent}

JSON 스키마 예시:
{
  "title": "...",
  "targetAudience": "...",
  "educationDuration": "...",
  "educationSession": ...,
  "goals": ["..."],
  "keyTopics": ["..."],
  "constraints": ["..."],
  "suggestedSearchQueries": ["..."],
  "designStyle": {"tone":"...", "colors":["..."], "layout":"..."}
}`;
    const text = await generateContent(aiModel, prompt, system);
    const parsed = safeJsonParse<any>(text) ?? { raw: text };
    return { output: parsed, log: '입력 해석 완료' };
  }

  if (stepType === 'web_search') {
    if (!options.enableWebSearch) {
      return { log: '웹 검색 비활성화(옵션)', output: { skipped: true } };
    }

    const queriesFromInterpret = Array.isArray(contextState.interpret?.suggestedSearchQueries)
      ? contextState.interpret.suggestedSearchQueries
      : [];

    // 동적 검색 쿼리 생성: documentContent에서 핵심 키워드 추출
    let fallbackQueries: string[] = [];
    if (!queriesFromInterpret.length && documentContent) {
      // 간단한 키워드 추출: 제목이나 주요 단어를 활용
      const contentPreview = documentContent.slice(0, 200).trim();
      const currentYear = new Date().getFullYear();

      // 사용자 입력에서 주요 키워드 추출 (간단한 방식)
      const keywords = contentPreview
        .replace(/[^\w\sㄱ-ㅎ가-힣]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2)
        .slice(0, 5)
        .join(' ');

      if (keywords.length > 5) {
        fallbackQueries = [
          `${keywords} 최신 정보 ${currentYear}`,
          `${keywords} 트렌드 ${currentYear}`,
          `${keywords} 가이드 ${currentYear}`,
        ];
      } else {
        // 키워드 추출 실패 시 기본 쿼리 사용
        fallbackQueries = [
          `교육 콘텐츠 트렌드 ${currentYear}`,
          `온라인 교육 방법 ${currentYear}`,
          `교수법 최신 동향 ${currentYear}`,
        ];
      }
    } else if (!queriesFromInterpret.length) {
      // documentContent가 없는 경우 기본 쿼리
      const currentYear = new Date().getFullYear();
      fallbackQueries = [
        `교육 콘텐츠 트렌드 ${currentYear}`,
        `온라인 교육 방법 ${currentYear}`,
        `교수법 최신 동향 ${currentYear}`,
      ];
    }

    const queries = (queriesFromInterpret.length ? queriesFromInterpret : fallbackQueries).slice(0, 3);
    const allResults: WebSearchResult[] = [];

    context.log(`[web_search] 검색 쿼리: ${queries.join(', ')}`);

    for (const q of queries) {
      try {
        const resp = await webSearch(q, 5);
        context.log(`[web_search] "${q}" → ${resp.results.length}개 결과`);
        allResults.push(...resp.results);
      } catch (searchError) {
        context.error(`[web_search] 검색 실패 (query="${q}"):`, searchError);
        // 검색 실패해도 계속 진행
      }
    }

    // URL 기준 dedupe
    const seen = new Set<string>();
    const deduped = allResults.filter((r) => {
      if (!r.url) return false;
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });

    return {
      log: `웹 검색 완료 (queries=${queries.length}, sources=${deduped.length})`,
      output: {
        queries,
        sources: deduped,
        retrievedAt: new Date().toISOString(),
      },
      artifacts: [
        // 캔버스/문서에서 공통으로 보여주기 위해 모든 산출물 assets에 sources를 넣어둡니다.
        { type: 'document', assets: { sources: deduped }, markCompleted: false },
        { type: 'infographic', assets: { sources: deduped }, markCompleted: false },
        { type: 'slides', assets: { sources: deduped }, markCompleted: false },
      ],
    };
  }

  if (stepType === 'generate_document') {
    const sources = normalizeSources(contextState.web?.results || []).slice(0, 8);

    // 교육 설정 정보 구성
    const educationDuration = projectContext?.educationDuration || '2시간';
    const educationSession = projectContext?.educationSession || 1;
    const educationCourse = projectContext?.educationCourse || '입문과정';
    const educationTargetLabel = projectContext?.educationTarget 
      ? EDUCATION_TARGET_LABELS[projectContext.educationTarget] || projectContext.educationTarget 
      : '일반 성인';

    const system = `당신은 교육 콘텐츠 기획자입니다. 사용자의 입력과 교육 설정을 바탕으로 '강의안(문서)'을 한국어로 작성하세요.
반드시 다음 규칙을 지키세요:
- 교육대상(${educationTargetLabel})의 수준과 특성에 맞는 언어, 예시, 난이도로 작성하세요.
- 교육 시간(${educationDuration})과 회차(${educationSession}회차)에 맞게 분량을 조절하세요.
- 웹 검색 출처가 주어지면, 최신/사실 주장에는 본문에 [1], [2] 형태로 인용을 포함해야 합니다.
- 문서 마지막에 반드시 "## Sources" 섹션을 만들고, 제공된 출처만 [n] 번호로 나열하세요(임의 출처 생성 금지).
- 제공된 출처가 없으면 "## Sources" 섹션에 웹 검색 미설정 안내를 남기세요.`;

    const sourcesBlock =
      sources.length > 0
        ? `\n\n[출처 목록 - 제공된 URL만 사용, 새 URL 생성 금지]\n${sources
            .map((s, i) => `[${i + 1}] ${s.title ? `${s.title} - ` : ''}${s.url}`)
            .join('\n')}\n`
        : `\n\n[출처 목록]\n(없음)\n`;

    const educationInfo = `
[교육 설정 - 반드시 준수]
- 교육대상: ${educationTargetLabel}
- 교육 시간: ${educationDuration}
- 교육 과정: ${educationCourse}
- 회차: ${educationSession}회차 (정확히 ${educationSession}회차만 구성할 것!)
`;

    const prompt = `사용자 입력:\n${documentContent}\n${educationInfo}\n요구사항:\n- 목차(요약) + 본문\n- 교육대상(${educationTargetLabel})에 맞는 난이도와 용어 사용\n- 정확히 ${educationSession}회차 구성(회차별 목표/시간/활동) - 이 회차 수를 절대 초과하지 말 것!\n- 총 교육 시간 ${educationDuration}에 맞게 분량 조절\n- 안전/주의사항(특히 시니어 대상이면 강조)\n- 문서 말미에 Sources 섹션 필수\n\n형식: Markdown${sourcesBlock}`;
    let md = await generateContent(aiModel, prompt, system);
    md = ensureSourcesSectionMarkdown(md, sources);
    return {
      log: '강의안(문서) 생성 완료',
      artifacts: [{ type: 'document', contentText: md, markCompleted: true }],
    };
  }

  if (stepType === 'generate_infographic') {
    const educationDuration = projectContext?.educationDuration || '2시간';
    const educationSession = projectContext?.educationSession || 1;
    const educationCourse = projectContext?.educationCourse || '입문과정';
    const educationTargetLabel = projectContext?.educationTarget 
      ? EDUCATION_TARGET_LABELS[projectContext.educationTarget] || projectContext.educationTarget 
      : '일반 성인';

    // 종합 강의안 내용 수집 (final_review 또는 각 단계의 콘텐츠)
    const combinedContent = contextState.interpret?.finalReview 
      || contextState.interpret?.combinedDocument
      || (() => {
        // 각 단계의 콘텐츠를 종합
        const parts: string[] = [];
        if (contextState.interpret?.curriculum) parts.push(`## 커리큘럼\n\n${contextState.interpret.curriculum}`);
        if (contextState.interpret?.lessonPlan) parts.push(`## 수업안\n\n${contextState.interpret.lessonPlan}`);
        if (contextState.interpret?.labTemplate) parts.push(`## 실습 가이드\n\n${contextState.interpret.labTemplate}`);
        if (contextState.interpret?.assessment) parts.push(`## 평가\n\n${contextState.interpret.assessment}`);
        return parts.length > 0 ? parts.join('\n\n---\n\n') : documentContent;
      })();

    const system = `당신은 인포그래픽 기획자입니다. 종합 강의안 내용을 바탕으로 교육 설정(대상: ${educationTargetLabel}, ${educationDuration}, ${educationSession}회차, ${educationCourse})에 맞는 풍성하고 시각적인 인포그래픽 설계 JSON을 작성하세요. 교육대상의 수준에 맞는 시각적 표현을 사용하고, 핵심 내용을 잘 요약하여 섹션별로 구성하세요. JSON만 반환하세요.`;
    const sources = contextState.web?.results?.length ? contextState.web.results.slice(0, 6) : [];
    const educationInfo = `[교육 설정]\n- 교육대상: ${educationTargetLabel}\n- 교육 시간: ${educationDuration}\n- 교육 과정: ${educationCourse}\n- 회차: ${educationSession}회차\n`;
    
    const sourcesBlock = sources.length > 0
      ? `\n\n[최신 정보 출처 - 참고용]\n${sources.map((s) => `- ${s.title || s.url}: ${s.snippet || ''}`).join('\n')}`
      : '';
    
    const prompt = `[종합 강의안 내용]\n${combinedContent}\n\n${educationInfo}${sourcesBlock}\n\n위 종합 강의안을 바탕으로 인포그래픽을 설계하세요. 다음을 포함하세요:\n- 학습 목표와 핵심 가치\n- 커리큘럼 구조와 주요 주제\n- 학습 경로와 단계\n- 실습/활동 하이라이트\n- 평가 방법\n\n가능하면 아래 출처를 참고하여 최신 트렌드 키워드를 반영하세요(출처 URL은 JSON의 sources 배열로 포함):\n${sources.map((s) => `- ${s.url}`).join('\n')}\n\nJSON 스키마:\n{\n  "title": "교육 제목",\n  "subtitle": "교육 대상 및 목표 요약",\n  "sections": [\n    {"heading": "섹션 제목", "bullets": ["핵심 포인트 1", "핵심 포인트 2"], "iconHint": "아이콘 힌트"}\n  ],\n  "palette": ["#색상코드1", "#색상코드2", "#색상코드3"],\n  "illustrationHints": ["삽화 힌트 1", "삽화 힌트 2"],\n  "sources": ["https://..."]\n}`;
    
    const text = await generateContent(aiModel, prompt, system);
    const json = safeJsonParse<any>(text) ?? { raw: text };
    return {
      log: '인포그래픽 설계 생성 완료 (종합 강의안 기반)',
      artifacts: [{ type: 'infographic', contentJson: json, markCompleted: true }],
    };
  }

  if (stepType === 'generate_slides') {
    const sources = normalizeSources(contextState.web?.results || []).slice(0, 8);
    const educationDuration = projectContext?.educationDuration || '2시간';
    const educationSession = projectContext?.educationSession || 1;
    const educationCourse = projectContext?.educationCourse || '입문과정';
    const educationTargetLabel = projectContext?.educationTarget 
      ? EDUCATION_TARGET_LABELS[projectContext.educationTarget] || projectContext.educationTarget 
      : '일반 성인';

    // 슬라이드 수 계산: 기본 6장, 회차당 +2장 (PRD: 3~15 범위)
    const defaultSlideCount = Math.min(6 + (educationSession - 1) * 2, 15);
    const slideCount = resolveSlideCount((options as any)?.slides?.slideCount, defaultSlideCount);

    const template = resolveTemplate((options as any)?.slides?.template);
    const templateHint =
      template === 'minimal'
        ? '미니멀/클린 톤(여백, 단색, 간결)'
        : template === 'creative'
          ? '크리에이티브/대담한 톤(강한 대비, 포인트 컬러)'
          : '모던/프로페셔널 톤(밸런스, 비즈니스)';

    const system = `당신은 교안 슬라이드 설계자입니다. 사용자의 입력과 교육 설정을 바탕으로 슬라이드 덱 구조 JSON을 작성하세요. JSON만 반환하세요.
반드시 다음 규칙을 지키세요:
- 교육대상(${educationTargetLabel})의 수준에 맞는 용어와 설명을 사용하세요.
- 교육 시간(${educationDuration})과 회차(${educationSession}회차)에 맞게 슬라이드 수와 내용 분량을 조절하세요.
- 출처가 주어지면, 각 슬라이드의 speakerNotes에 최소 1개 이상의 [n] 인용을 포함하세요.
- 제공된 출처 번호([1]..[n])만 사용하세요. 임의 출처 번호 생성 금지.
- JSON은 반드시 파싱 가능한 형태로만 출력하세요.`;

    const sourcesBlock =
      sources.length > 0
        ? `\n\n[출처 목록 - 제공된 URL만 사용]\n${sources.map((s, i) => `[${i + 1}] ${s.url}`).join('\n')}\n`
        : `\n\n[출처 목록]\n(없음)\n`;

    const educationInfo = `[교육 설정 - 반드시 준수]\n- 교육대상: ${educationTargetLabel}\n- 교육 시간: ${educationDuration}\n- 교육 과정: ${educationCourse}\n- 회차: ${educationSession}회차\n- 슬라이드 템플릿 톤: ${templateHint}\n`;

    const prompt = `사용자 입력:\n${documentContent}\n\n${educationInfo}\n요구사항:\n- 슬라이드 약 ${slideCount}장 (${educationDuration}, ${educationSession}회차에 적합한 분량)\n- 교육대상(${educationTargetLabel})에 맞는 난이도와 표현\n- 각 슬라이드는 title/bullets/speakerNotes/visualHint 포함\n- speakerNotes에 출처 인용([n]) 포함 (출처가 있을 때)\n\nJSON 스키마:\n{\n  "deckTitle": "...",\n  "slides": [\n    {"title":"...","bullets":["..."],"speakerNotes":"...","visualHint":"..."}\n  ]\n}\n${sourcesBlock}`;

    const text = await generateContent(aiModel, prompt, system);
    let json = safeJsonParse<any>(text) ?? { raw: text };
    json = enforceSlideCitationsAndDeckSources(json, sources);
    return {
      log: '슬라이드 설계 생성 완료',
      artifacts: [{ type: 'slides', contentJson: json, markCompleted: true }],
    };
  }

  if (stepType === 'revise_document') {
    const instruction = (stepInput?.instruction || '').toString().trim();
    const sources = normalizeSources(contextState.web?.results || []).slice(0, 8);

    const system = `당신은 교육 문서 편집자입니다. 기존 강의안(문서)을 사용자의 편집 지시문에 맞게 수정하세요.
출력은 Markdown만 반환하세요.
규칙:
- 출처가 주어지면 사실/통계 주장에는 [n] 인용을 포함
- 문서 말미에 ## Sources 섹션 유지/갱신(제공된 출처만, 임의 URL 생성 금지)`;

    const sourcesBlock =
      sources.length > 0
        ? `\n\n[출처 목록 - 제공된 URL만 사용]\n${sources
            .map((s, i) => `[${i + 1}] ${s.title ? `${s.title} - ` : ''}${s.url}`)
            .join('\n')}\n`
        : `\n\n[출처 목록]\n(없음)\n`;

    const prompt = `편집 지시문:\n${instruction || '(없음)'}\n\n기존 문서(참고):\n${stepInput?.existingDocument || ''}\n\n요구사항:\n- 기존 문서의 구조/톤을 가능한 유지\n- 지시문을 우선 반영\n- Sources 섹션 필수\n\n형식: Markdown${sourcesBlock}`;

    let md = await generateContent(aiModel, prompt, system);
    md = ensureSourcesSectionMarkdown(md, sources);

    return {
      log: '강의안(문서) 수정 완료',
      artifacts: [{ type: 'document', contentText: md, markCompleted: true }],
    };
  }

  if (stepType === 'revise_infographic') {
    const instruction = (stepInput?.instruction || '').toString().trim();
    const system = `당신은 인포그래픽 편집자입니다. 기존 인포그래픽 JSON을 사용자의 편집 지시문에 맞게 수정하세요. JSON만 반환하세요.`;
    const prompt = `편집 지시문:\n${instruction || '(없음)'}\n\n기존 인포그래픽(JSON):\n${JSON.stringify(
      existingArtifacts.infographic || {},
      null,
      2
    )}\n\n출력: 수정된 JSON`;
    const text = await generateContent(aiModel, prompt, system);
    const json = safeJsonParse<any>(text) ?? { raw: text };
    return {
      log: '인포그래픽 수정 완료',
      artifacts: [{ type: 'infographic', contentJson: json, markCompleted: true }],
    };
  }

  if (stepType === 'revise_slides') {
    const instruction = (stepInput?.instruction || '').toString().trim();
    const sources = normalizeSources(contextState.web?.results || []).slice(0, 8);

    const system = `당신은 교안 슬라이드 편집자입니다. 기존 슬라이드 덱 JSON을 사용자의 편집 지시문에 맞게 수정하세요. JSON만 반환하세요.
규칙:
- 출처가 주어지면 speakerNotes에 [n] 인용 유지/추가
- 제공된 [1]..[n]만 사용(임의 URL/번호 생성 금지)`;
    const prompt = `편집 지시문:\n${instruction || '(없음)'}\n\n기존 슬라이드 덱(JSON):\n${JSON.stringify(
      existingArtifacts.slides || {},
      null,
      2
    )}\n\n출력: 수정된 JSON`;
    const text = await generateContent(aiModel, prompt, system);
    let json = safeJsonParse<any>(text) ?? { raw: text };
    json = enforceSlideCitationsAndDeckSources(json, sources);
    return {
      log: '슬라이드 수정 완료',
      artifacts: [{ type: 'slides', contentJson: json, markCompleted: true }],
    };
  }

  if (stepType === 'design_assets') {
    if (!options.enableImageGeneration) {
      return { log: '이미지 생성 비활성화(옵션)', output: { skipped: true } };
    }

    const title = contextState.interpret?.title || '교육 콘텐츠';
    const palette = existingArtifacts.infographic?.palette || contextState.interpret?.designStyle?.colors || [];
    const paletteText = Array.isArray(palette) && palette.length ? palette.join(', ') : 'modern clean palette';

    // 1. 배경 이미지 생성
    const backgroundPrompt = `Create a clean modern abstract background for an educational infographic and slide deck.\nTopic: ${title}\nPalette: ${paletteText}\nStyle: minimal, professional, lots of whitespace, subtle shapes.\nNo text.`;
    const bg = await generateImageDataUrl(backgroundPrompt);
    if (!bg) {
      const hasVertexKey = !!(process.env.VERTEX_API_KEY || process.env.VERTEXX_API_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS);
      const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

      let note = '이미지 생성 API 키가 설정되지 않았습니다.';
      if (!hasVertexKey && !hasOpenAIKey) {
        note = 'VERTEX_API_KEY (또는 GOOGLE_APPLICATION_CREDENTIALS) 또는 OPENAI_API_KEY 중 하나가 필요합니다.';
      } else if (!hasVertexKey) {
        note = 'Vertex AI Imagen API를 사용하려면 VERTEX_API_KEY와 VERTEX_PROJECT_ID가 필요합니다. 현재는 OpenAI DALL-E를 사용합니다.';
      }

      return {
        log: '이미지 생성: API 키 미설정 또는 생성 실패(스킵)',
        output: { skipped: true, note }
      };
    }

    // 2. 콘텐츠별 삽화 생성 (슬라이드가 있을 경우)
    const illustrations: any[] = [];
    const slidesArtifact = existingArtifacts.slides;

    if (slidesArtifact?.content_json?.slides && Array.isArray(slidesArtifact.content_json.slides)) {
      const slides = slidesArtifact.content_json.slides;
      const maxIllustrations = Math.min(3, slides.length); // 최대 3개 슬라이드에 대해 삽화 생성

      context.log(`[design_assets] 슬라이드 ${slides.length}개 중 ${maxIllustrations}개에 대해 삽화 생성 시도`);

      // 중요한 슬라이드 선택 (처음, 중간, 마지막)
      const selectedIndices: number[] = [];
      if (maxIllustrations >= 1 && slides.length > 0) selectedIndices.push(0); // 처음
      if (maxIllustrations >= 2 && slides.length > 2) selectedIndices.push(Math.floor(slides.length / 2)); // 중간
      if (maxIllustrations >= 3 && slides.length > 1) selectedIndices.push(slides.length - 1); // 마지막

      for (let i = 0; i < selectedIndices.length; i++) {
        const slideIdx = selectedIndices[i];
        const slide = slides[slideIdx];

        if (slide.title) {
          const illustrationPrompt = `Create a simple, clean illustration representing the concept: "${slide.title}".\n${
            slide.bulletPoints?.slice(0, 2).join(', ') || ''
          }\nStyle: minimal, educational, flat design, ${paletteText}.\nNo text in the image.`;

          try {
            const illustration = await generateImageDataUrl(illustrationPrompt);
            if (illustration) {
              illustrations.push({
                ...illustration,
                slideNumber: slide.slideNumber || slideIdx + 1,
                title: slide.title,
              });
              context.log(`[design_assets] 슬라이드 ${slideIdx + 1} 삽화 생성 완료`);
            }
          } catch (error) {
            context.warn(`[design_assets] 슬라이드 ${slideIdx + 1} 삽화 생성 실패:`, error);
          }
        }
      }
    }

    // 3. 결과 반환
    const outputSummary = {
      background: { model: bg.model, createdAt: bg.createdAt },
      illustrations: illustrations.map(ill => ({
        slideNumber: ill.slideNumber,
        title: ill.title,
        model: ill.model,
        createdAt: ill.createdAt,
      })),
    };

    const artifacts: any[] = [
      { type: 'infographic', assets: { background: bg }, markCompleted: false },
      { type: 'slides', assets: { background: bg, illustrations }, markCompleted: false },
    ];

    const logMessage = illustrations.length > 0
      ? `디자인 에셋 생성 완료: 배경 이미지 1개 + 삽화 ${illustrations.length}개`
      : '디자인 배경 이미지 생성 완료';

    return {
      log: logMessage,
      output: outputSummary,
      artifacts,
    };
  }

  // ============================================
  // 6단계 파이프라인 처리
  // ============================================

  // 교육 설정 추출 (6단계 파이프라인에서 공통 사용)
  const educationDuration = projectContext?.educationDuration || '2시간';
  const educationSession = projectContext?.educationSession || 1;
  const educationCourse = projectContext?.educationCourse || '입문과정';
  const educationTarget = projectContext?.educationTarget 
    ? EDUCATION_TARGET_LABELS[projectContext.educationTarget] || projectContext.educationTarget 
    : '일반 성인';
  const projectTitle = projectContext?.title || '교육 콘텐츠';
  const projectDescription = projectContext?.description || '';

  const educationInfo = `[교육 설정]
- 제목: ${projectTitle}
- 설명: ${projectDescription}
- 교육대상: ${educationTarget}
- 교육 시간: ${educationDuration}
- 교육 과정: ${educationCourse}
- 회차: ${educationSession}회차`;

  // 웹 검색 결과 정리
  const webSources = normalizeSources(contextState.web?.results || []).slice(0, 8);
  const sourcesBlock =
    webSources.length > 0
      ? `\n\n[참고 출처]\n${webSources.map((s, i) => `[${i + 1}] ${s.title ? `${s.title} - ` : ''}${s.url}`).join('\n')}\n`
      : '';

  // 1단계: 커리큘럼 설계 (개선된 버전 - JSON 출력 + 검증)
  if (stepType === 'curriculum_design') {
    // BriefingInput 구성
    const briefing: BriefingInput = {
      topic: projectTitle,
      description: projectDescription,
      targetAudience: projectContext?.educationTarget || 'general_adult',
      totalDuration: educationDuration,
      sessionCount: educationSession,
      courseLevel: educationCourse,
      documentContent: documentContent,
    };

    // 역할 기반 시스템 프롬프트
    const system = STAGE_PERSONAS.curriculum_design + `

**출력 규칙:**
- 반드시 JSON 형식으로만 출력하세요
- 다른 텍스트 없이 순수 JSON만 반환
- sessions 배열은 정확히 ${educationSession}개여야 합니다`;

    // 웹 검색 컨텍스트
    const webSearchContext = webSources.length > 0
      ? webSources.map((s, i) => `[${i + 1}] ${s.title || s.url}`).join('\n')
      : undefined;

    // 프롬프트 생성 및 AI 호출 (최대 2회 재시도)
    let curriculum: CurriculumOutput | null = null;
    let markdownFallback: string | null = null;
    let validationFeedback: string | undefined;
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const prompt = buildCurriculumPrompt(briefing, webSearchContext, validationFeedback);
      
      context.log(`[curriculum_design] 시도 ${attempt + 1}/${maxRetries + 1}`);
      const text = await generateContent(aiModel, prompt, system);
      
      // JSON 파싱 시도
      const parsed = safeJsonParse<CurriculumOutput>(text);
      
      if (parsed) {
        // 검증 실행
        const validation = validateCurriculum(parsed, briefing);
        
        if (validation.isValid) {
          curriculum = parsed;
          context.log(`[curriculum_design] 검증 통과`);
          break;
        } else {
          context.log(`[curriculum_design] 검증 실패: ${validation.issues.join(', ')}`);
          validationFeedback = generateValidationFeedback(validation, '커리큘럼 설계');
          
          // 마지막 시도면 경고와 함께 사용
          if (attempt === maxRetries) {
            curriculum = parsed;
            context.warn(`[curriculum_design] 검증 실패했지만 계속 진행: ${validation.issues.join(', ')}`);
          }
        }
      } else {
        // JSON 파싱 실패 시 Markdown으로 폴백
        context.warn(`[curriculum_design] JSON 파싱 실패, Markdown 폴백`);
        markdownFallback = text;
        
        if (attempt === maxRetries) {
          break;
        }
        
        validationFeedback = `\n## ⚠️ 이전 출력 형식 오류\n출력이 유효한 JSON이 아닙니다. 반드시 순수 JSON 형식으로만 출력하세요. \`\`\`json 마크다운 코드블록도 사용하지 마세요.\n`;
      }
    }

    // 결과 반환
    if (curriculum) {
      // JSON 구조화 출력 (+ Markdown 변환)
      const md = convertCurriculumToMarkdown(curriculum);
      return {
        log: '커리큘럼 설계 완료 (JSON 구조화)',
        output: { 
          curriculum: md, 
          curriculumJson: curriculum // 구조화된 데이터도 저장
        },
        artifacts: [{ type: 'document', contentText: md, markCompleted: false }],
      };
    } else {
      // Markdown 폴백
      return {
        log: '커리큘럼 설계 완료 (Markdown)',
        output: { curriculum: markdownFallback },
        artifacts: [{ type: 'document', contentText: markdownFallback || '', markCompleted: false }],
      };
    }
  }

  // 2단계: 수업안 작성 (개선된 버전 - JSON 출력 + 검증)
  if (stepType === 'lesson_plan') {
    const previousOutput = contextState.interpret?.curriculum || '';
    const curriculumJson = contextState.interpret?.curriculumJson as CurriculumOutput | undefined;
    
    // 역할 기반 시스템 프롬프트
    const system = STAGE_PERSONAS.lesson_plan + `

**출력 규칙:**
- 반드시 JSON 형식으로만 출력하세요
- 다른 텍스트 없이 순수 JSON만 반환
- lessonPlans 배열은 정확히 ${educationSession}개여야 합니다`;

    // 재시도 로직을 포함한 생성
    const result = await generateWithRetry<{ lessonPlans: LessonPlanOutput[] }>({
      stageName: 'lesson_plan',
      aiModel,
      systemPrompt: system,
      buildPrompt: (feedback) => buildLessonPlanPrompt(
        educationInfo,
        documentContent,
        previousOutput,
        sourcesBlock,
        educationSession,
        educationTarget,
        feedback
      ),
      parseOutput: (text) => safeJsonParse<{ lessonPlans: LessonPlanOutput[] }>(text),
      validate: (output) => {
        // 각 세션 수업안 검증
        const issues: string[] = [];
        const warnings: string[] = [];
        
        if (!output.lessonPlans || output.lessonPlans.length === 0) {
          return { isValid: false, issues: ['수업안이 없습니다'], warnings: [], suggestions: [] };
        }
        
        if (output.lessonPlans.length !== educationSession) {
          issues.push(`세션 수 불일치: 요청 ${educationSession}개, 생성 ${output.lessonPlans.length}개`);
        }
        
        output.lessonPlans.forEach((plan, i) => {
          const validation = validateLessonPlan(plan, curriculumJson || null, i + 1);
          issues.push(...validation.issues.map(issue => `세션 ${i + 1}: ${issue}`));
          warnings.push(...validation.warnings.map(w => `세션 ${i + 1}: ${w}`));
        });
        
        return {
          isValid: issues.length === 0,
          issues,
          warnings,
          suggestions: issues.length > 0 ? [`정확히 ${educationSession}개의 세션 수업안을 포함해야 합니다`] : []
        };
      },
      maxRetries: 2,
      context,
    });

    // 결과 반환
    if (result.structured) {
      const md = convertLessonPlansToMarkdown(result.structured.lessonPlans);
      return {
        log: `수업안 작성 완료 (JSON 구조화, ${result.attempts}회 시도)`,
        output: { 
          lessonPlan: md, 
          lessonPlanJson: result.structured.lessonPlans
        },
        artifacts: [{ type: 'document', contentText: md, markCompleted: false }],
      };
    } else {
      // Markdown 폴백
      let md = result.rawText || '';
      md = ensureSourcesSectionMarkdown(md, webSources);
      return {
        log: '수업안 작성 완료 (Markdown)',
        output: { lessonPlan: md },
        artifacts: [{ type: 'document', contentText: md, markCompleted: false }],
      };
    }
  }

  // 3단계: 슬라이드 구성 (개선된 버전 - JSON 출력 + 검증)
  if (stepType === 'slides') {
    const previousOutput = contextState.interpret?.lessonPlan || contextState.interpret?.curriculum || '';
    
    // 역할 기반 시스템 프롬프트
    const system = STAGE_PERSONAS.slides + `

**출력 규칙:**
- 반드시 JSON 형식으로만 출력하세요
- 다른 텍스트 없이 순수 JSON만 반환
- 각 슬라이드에 발표자 노트 필수 포함`;

    // PRD 기준: 3~15장 (사용자 지정이 있으면 우선)
    const defaultSlideCount = Math.min(6 + (educationSession - 1) * 4, 15);
    const slideCount = resolveSlideCount((options as any)?.slides?.slideCount, defaultSlideCount);

    const template = resolveTemplate((options as any)?.slides?.template);
    const templateHint =
      template === 'minimal'
        ? '미니멀/클린 톤(여백, 단색, 간결)'
        : template === 'creative'
          ? '크리에이티브/대담한 톤(강한 대비, 포인트 컬러)'
          : '모던/프로페셔널 톤(밸런스, 비즈니스)';

    const educationInfoWithTemplate = `${educationInfo}\n[슬라이드 템플릿]\n- template: ${template || 'default'}\n- 톤: ${templateHint}\n`;

    // 재시도 로직을 포함한 생성
    const result = await generateWithRetry<SlideOutput>({
      stageName: 'slides',
      aiModel,
      systemPrompt: system,
      buildPrompt: (feedback) => buildSlidesPrompt(
        educationInfoWithTemplate,
        previousOutput,
        sourcesBlock,
        slideCount,
        educationTarget,
        feedback
      ),
      parseOutput: (text) => safeJsonParse<SlideOutput>(text),
      validate: (output) => validateSlides(output, slideCount),
      maxRetries: 2,
      context,
    });

    // 결과 처리
    if (result.structured) {
      let json: SlideOutput = result.structured;
      json = enforceSlideCitationsAndDeckSources(json, webSources);
      
      const md = convertSlidesToMarkdown(json);
      return {
        log: `슬라이드 구성 완료 (JSON 구조화, ${result.attempts}회 시도)`,
        output: { 
          slides: json,
          slidesMarkdown: md 
        },
        artifacts: [{ type: 'slides', contentJson: json, markCompleted: false }],
      };
    } else {
      // Raw 폴백
      let json = safeJsonParse<any>(result.rawText || '') ?? { raw: result.rawText };
      json = enforceSlideCitationsAndDeckSources(json, webSources);
      return {
        log: '슬라이드 구성 완료 (Raw)',
        output: { slides: json },
        artifacts: [{ type: 'slides', contentJson: json, markCompleted: false }],
      };
    }
  }

  // 4단계: 실습 템플릿
  if (stepType === 'lab_template') {
    const previousOutput = contextState.interpret?.lessonPlan || '';
    
    const system = `당신은 교육 실습 가이드 작성 전문가입니다. 수업안을 바탕으로 학습자가 따라할 수 있는 실습 템플릿을 작성하세요.
반드시 다음 규칙을 지키세요:
- 단계별로 명확하게 작성
- 예상 소요 시간 명시
- 체크리스트 형태로 진행 확인 가능하게
- Markdown 형식으로 출력`;

    const prompt = `${educationInfo}

수업안:
${previousOutput}

다음 구조로 실습 가이드를 작성하세요:

## 실습 템플릿

### 실습 개요
- **실습 목표**: 
- **예상 소요 시간**: 
- **필요 환경/도구**: 

### 실습 단계

#### Step 1: (단계명)
- [ ] 작업 1
- [ ] 작업 2
- **예상 시간**: 분
- **주의사항**: 

(필요한 만큼 Step 반복)

### 예상 결과물
- (학습자가 완성해야 할 결과물 설명)

### 트러블슈팅
- **문제 1**: 
  - 해결 방법: `;

    const md = await generateContent(aiModel, prompt, system);
    return {
      log: '실습 템플릿 생성 완료',
      output: { labTemplate: md },
      artifacts: [{ type: 'document', contentText: md, markCompleted: false }],
    };
  }

  // 5단계: 평가/퀴즈 (개선된 버전 - JSON 출력 + 검증)
  if (stepType === 'assessment') {
    const previousOutput = contextState.interpret?.curriculum || '';
    const curriculumJson = contextState.interpret?.curriculumJson as CurriculumOutput | undefined;
    
    // 학습 목표 추출
    const learningObjectives = curriculumJson?.learningObjectives || [];
    
    // 역할 기반 시스템 프롬프트
    const system = STAGE_PERSONAS.assessment + `

**출력 규칙:**
- 반드시 JSON 형식으로만 출력하세요
- 다른 텍스트 없이 순수 JSON만 반환
- 최소 5개 이상의 평가 문항 포함`;

    // 재시도 로직을 포함한 생성
    const result = await generateWithRetry<AssessmentOutput>({
      stageName: 'assessment',
      aiModel,
      systemPrompt: system,
      buildPrompt: (feedback) => buildAssessmentPrompt(
        educationInfo,
        learningObjectives,
        sourcesBlock,
        educationTarget,
        feedback
      ),
      parseOutput: (text) => safeJsonParse<AssessmentOutput>(text),
      validate: (output) => validateAssessment(output, learningObjectives),
      maxRetries: 2,
      context,
    });

    // 결과 처리
    if (result.structured) {
      const md = convertAssessmentToMarkdown(result.structured);
      return {
        log: `평가/퀴즈 생성 완료 (JSON 구조화, ${result.attempts}회 시도)`,
        output: { 
          assessment: md,
          assessmentJson: result.structured 
        },
        artifacts: [{ type: 'document', contentText: md, markCompleted: false }],
      };
    } else {
      // Markdown 폴백
      const md = result.rawText || '';
      return {
        log: '평가/퀴즈 생성 완료 (Markdown)',
        output: { assessment: md },
        artifacts: [{ type: 'document', contentText: md, markCompleted: false }],
      };
    }
  }

  // 6단계: 최종 검토 및 종합 강의안 생성 (일관성 체크 포함)
  if (stepType === 'final_review') {
    const allOutputs = contextState.interpret || {};
    
    // 이전 단계들의 콘텐츠 수집
    const curriculum = allOutputs.curriculum || '';
    const lessonPlan = allOutputs.lessonPlan || '';
    const labTemplate = allOutputs.labTemplate || '';
    const assessment = allOutputs.assessment || '';
    
    // 구조화된 데이터도 수집 (있으면)
    const curriculumJson = allOutputs.curriculumJson as CurriculumOutput | undefined;
    const lessonPlanJson = allOutputs.lessonPlanJson as LessonPlanOutput[] | undefined;
    const slidesJson = allOutputs.slides as SlideOutput | undefined;
    const assessmentJson = allOutputs.assessmentJson as AssessmentOutput | undefined;
    
    // 파이프라인 일관성 체크 (구조화된 데이터가 있는 경우)
    let consistencyNote = '';
    if (curriculumJson || lessonPlanJson || assessmentJson) {
      const { checkPipelineConsistency } = await import('../lib/agent/validation');
      
      const pipelineContext: PipelineContext = {
        briefing: {
          topic: projectTitle,
          targetAudience: educationTarget,
          totalDuration: educationDuration,
          sessionCount: educationSession,
          courseLevel: educationCourse,
        },
        curriculum: curriculumJson,
        lessonPlans: lessonPlanJson,
        slides: slidesJson,
        assessment: assessmentJson,
      };
      
      const consistencyResult = checkPipelineConsistency(pipelineContext);
      
      if (consistencyResult.issues.length > 0 || consistencyResult.warnings.length > 0) {
        consistencyNote = '\n\n## ⚠️ 품질 검토 결과\n';
        
        if (consistencyResult.issues.length > 0) {
          consistencyNote += '### 주의 사항:\n';
          consistencyResult.issues.forEach(issue => {
            consistencyNote += `- ❌ ${issue}\n`;
          });
        }
        
        if (consistencyResult.warnings.length > 0) {
          consistencyNote += '### 권장 사항:\n';
          consistencyResult.warnings.forEach(warning => {
            consistencyNote += `- ⚠️ ${warning}\n`;
          });
        }
        
        context.log(`[final_review] 일관성 체크 결과: issues=${consistencyResult.issues.length}, warnings=${consistencyResult.warnings.length}`);
      } else {
        consistencyNote = '\n\n✅ **품질 검토 통과**: 모든 단계가 일관성 있게 생성되었습니다.\n';
        context.log(`[final_review] 일관성 체크 통과`);
      }
    }
    
    const system = `당신은 교육 콘텐츠 편집 전문가입니다. 여러 단계에서 생성된 교육 콘텐츠를 하나의 완성된 강의안으로 통합하세요.

반드시 다음 규칙을 지키세요:
- 모든 콘텐츠를 자연스럽게 연결
- 중복 내용 제거
- 일관된 톤과 스타일 유지
- 깔끔하고 전문적인 보고서 형식
- Markdown 형식으로 출력 (표 사용 권장)`;

    const prompt = `${educationInfo}

아래 콘텐츠들을 통합하여 완성된 강의안을 작성하세요:

---
## 커리큘럼
${curriculum || '(미생성)'}

---
## 수업안
${lessonPlan || '(미생성)'}

---
## 실습 가이드
${labTemplate || '(미생성)'}

---
## 평가/퀴즈
${assessment || '(미생성)'}

---

위 내용을 종합하여 다음 형식의 완성된 강의안을 작성하세요:

# ${projectContext?.title || '교육 프로그램'}

## 📋 개요
| 항목 | 내용 |
|------|------|
| 교육 시간 | ${educationDuration} |
| 교육 과정 | ${educationCourse} |
| 총 회차 | ${educationSession}회차 |
| 교육 대상 | ${educationTarget} |

## 🎯 학습 목표
(커리큘럼에서 학습 목표 정리 - 번호 목록)

## 📚 커리큘럼 개요
(커리큘럼 내용을 표 형식으로 정리)

## 📖 세션별 수업 계획
(수업안 내용을 세션별로 상세히 정리)

## 🔬 실습 활동
(실습 가이드 내용 정리)

## ✅ 평가 및 퀴즈
(평가/퀴즈 내용 정리)

## 📌 강의 진행 가이드
(강사를 위한 진행 팁 추가)

---
*생성일: ${new Date().toLocaleDateString('ko-KR')}*`;

    const md = await generateContent(aiModel, prompt, system);
    
    // 일관성 체크 결과 추가
    const finalMd = md + consistencyNote;
    
    return {
      log: '종합 강의안 생성 완료 (일관성 체크 포함)',
      output: { finalReview: finalMd, combinedDocument: finalMd },
      artifacts: [{ type: 'document', contentText: finalMd, markCompleted: true }],
    };
  }

  return { log: `알 수 없는 stepType: ${stepType}`, output: { skipped: true } };
}

export async function generationJobWorker(queueItem: unknown, context: InvocationContext): Promise<void> {
  const msg = safeJsonParse<JobQueueMessage>(queueItem) as JobQueueMessage | null;
  if (!msg?.jobId) {
    context.warn('[GenerationJobWorker] Missing jobId in queue message');
    return;
  }

  const jobId = msg.jobId;
  context.log(`[GenerationJobWorker] Processing jobId=${jobId}`);

  let shouldRequeue = false;

  await transaction(async (client) => {
    // job + project + steps 조회(락 걸고 단일 worker만 진행)
    const jobRes = await client.query(
      `SELECT * FROM generation_jobs WHERE id = $1 FOR UPDATE`,
      [jobId]
    );
    if (jobRes.rows.length === 0) {
      context.warn(`[GenerationJobWorker] Job not found: ${jobId}`);
      return;
    }
    const job = jobRes.rows[0];

    // 완료/실패면 종료
    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      context.log(`[GenerationJobWorker] Job already ${job.status}: ${jobId}`);
      return;
    }

    const projectId = job.project_id as string;
    const aiModel = (job.ai_model as any) as 'gemini' | 'claude' | 'chatgpt';
    const options = (job.options || {}) as GenerationOptions;

    // 입력 원문과 교육 설정 정보를 projects에서 읽기
    const projRes = await client.query(
      `SELECT document_content, title, description, education_duration, education_course, education_session 
       FROM projects WHERE id = $1`, 
      [projectId]
    );
    const projectData = projRes.rows[0] || {};
    const documentContent = projectData.document_content || '';
    const projectContext = {
      title: projectData.title || '',
      description: projectData.description || '',
      educationTarget: projectData.education_target || null,
      educationDuration: projectData.education_duration || '',
      educationCourse: projectData.education_course || '',
      educationSession: projectData.education_session || null,
    };

    const nextStepRes = await client.query(
      `SELECT * FROM generation_steps WHERE job_id = $1 AND status IN ('pending') ORDER BY order_index ASC LIMIT 1`,
      [jobId]
    );

    if (nextStepRes.rows.length === 0) {
      // 모든 step 완료
      await client.query(`UPDATE generation_jobs SET status = 'completed', updated_at = NOW() WHERE id = $1`, [
        jobId,
      ]);
      await client.query(`UPDATE projects SET status = 'completed', updated_at = NOW() WHERE id = $1`, [projectId]);
      context.log(`[GenerationJobWorker] Job completed: ${jobId}`);
      return;
    }

    const step = nextStepRes.rows[0];
    const stepId = step.id as string;
    const stepType = step.step_type as GenerationStepType;
    const stepOrderIndex = Number(step.order_index ?? 0);
    const stepInput = typeof step.input === 'string' ? safeJsonParse<any>(step.input) : step.input;

    // step 시작
    await client.query(
      `UPDATE generation_steps SET status = 'processing', started_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [stepId]
    );
    await client.query(
      `UPDATE generation_jobs SET status = 'processing', updated_at = NOW() WHERE id = $1`,
      [jobId]
    );

    try {
      // 모든 완료된 step의 output을 조회하여 contextState에 누적
      const allCompletedStepsRes = await client.query(
        `SELECT step_type, output FROM generation_steps WHERE job_id = $1 AND status = 'completed' ORDER BY order_index ASC`,
        [jobId]
      );
      
      // 이전 단계들의 output을 병합하여 contextState 구성
      const accumulatedOutputs: Record<string, any> = {};
      let webQueries: string[] = [];
      let webSources: any[] = [];
      
      for (const row of allCompletedStepsRes.rows) {
        const stepOutput = row.output || {};
        const stepTypeKey = row.step_type as string;
        
        // web_search 단계의 결과
        if (stepTypeKey === 'web_search') {
          webQueries = Array.isArray(stepOutput.queries) ? stepOutput.queries : [];
          webSources = Array.isArray(stepOutput.sources) ? stepOutput.sources : [];
        }
        
        // 각 단계의 주요 output을 누적
        // interpret 단계의 output (title, suggestedSearchQueries 등)
        if (stepTypeKey === 'interpret' && stepOutput) {
          Object.assign(accumulatedOutputs, stepOutput);
        }
        
        // curriculum_design의 curriculum
        if (stepOutput.curriculum) {
          accumulatedOutputs.curriculum = stepOutput.curriculum;
        }
        // lesson_plan의 lessonPlan
        if (stepOutput.lessonPlan) {
          accumulatedOutputs.lessonPlan = stepOutput.lessonPlan;
        }
        // slides의 slides
        if (stepOutput.slides) {
          accumulatedOutputs.slidesOutput = stepOutput;
        }
        // lab_template의 labTemplate
        if (stepOutput.labTemplate) {
          accumulatedOutputs.labTemplate = stepOutput.labTemplate;
        }
        // assessment의 assessment
        if (stepOutput.assessment) {
          accumulatedOutputs.assessment = stepOutput.assessment;
        }
        // final_review의 finalReview 및 combinedDocument
        if (stepOutput.finalReview) {
          accumulatedOutputs.finalReview = stepOutput.finalReview;
        }
        if (stepOutput.combinedDocument) {
          accumulatedOutputs.combinedDocument = stepOutput.combinedDocument;
        }
      }
      
      context.log(`[GenerationJobWorker] Accumulated outputs from ${allCompletedStepsRes.rows.length} completed steps`);
      context.log(`[GenerationJobWorker] Available keys: ${Object.keys(accumulatedOutputs).join(', ')}`);

      const existingInfographic = (
        await client.query(
          `SELECT content_json FROM generation_artifacts WHERE job_id = $1 AND artifact_type = 'infographic' LIMIT 1`,
          [jobId]
        )
      ).rows[0]?.content_json;

      const existingSlides = (
        await client.query(
          `SELECT content_json FROM generation_artifacts WHERE job_id = $1 AND artifact_type = 'slides' LIMIT 1`,
          [jobId]
        )
      ).rows[0]?.content_json;

      const existingDocument = (
        await client.query(
          `SELECT content_text FROM generation_artifacts WHERE job_id = $1 AND artifact_type = 'document' LIMIT 1`,
          [jobId]
        )
      ).rows[0]?.content_text;

      const result = await runStep(
        stepType,
        aiModel,
        projectId,
        documentContent,
        options,
        { ...(stepInput || {}), existingDocument },
        { interpret: accumulatedOutputs, web: { queries: webQueries, results: webSources } },
        { infographic: existingInfographic, slides: existingSlides },
        context,
        projectContext
      );

      // 산출물 반영
      if (result.artifacts?.length) {
        for (const a of result.artifacts) {
          await client.query(
            `UPDATE generation_artifacts
             SET status = CASE WHEN $6::boolean THEN 'completed' ELSE status END,
                 content_text = COALESCE($3, content_text),
                 content_json = COALESCE($4::jsonb, content_json),
                 assets = COALESCE(assets, '{}'::jsonb) || COALESCE($5::jsonb, '{}'::jsonb),
                 updated_at = NOW()
             WHERE job_id = $1 AND artifact_type = $2`,
            [
              jobId,
              a.type,
              a.contentText ?? null,
              a.contentJson ? JSON.stringify(a.contentJson) : null,
              a.assets ? JSON.stringify(a.assets) : null,
              a.markCompleted === true,
            ]
          );
        }
      }

      await client.query(
        `UPDATE generation_steps
         SET status = 'completed',
             completed_at = NOW(),
             output = $2::jsonb,
             log = $3,
             updated_at = NOW()
         WHERE id = $1`,
        [stepId, JSON.stringify(result.output ?? {}), result.log ?? null]
      );

      // UI에서 진행률 표시용(current_step_index)
      await client.query(
        `UPDATE generation_jobs SET current_step_index = $2, updated_at = NOW() WHERE id = $1`,
        [jobId, stepOrderIndex + 1]
      );

      context.log(`[GenerationJobWorker] Step completed: ${stepType} (${stepId})`);

      // 다음 step이 남아있으면 worker를 다시 큐에 넣어서 연속 실행합니다.
      const remaining = await client.query(
        `SELECT 1 FROM generation_steps WHERE job_id = $1 AND status = 'pending' LIMIT 1`,
        [jobId]
      );
      if (remaining.rows.length > 0) {
        shouldRequeue = true;
      } else {
        // 방금 step이 마지막이었으면 즉시 job을 완료 처리합니다.
        await client.query(
          `UPDATE generation_jobs SET status = 'completed', updated_at = NOW() WHERE id = $1`,
          [jobId]
        );
        await client.query(`UPDATE projects SET status = 'completed', updated_at = NOW() WHERE id = $1`, [
          projectId,
        ]);
        context.log(`[GenerationJobWorker] Job completed: ${jobId}`);
      }
    } catch (e: any) {
      const message = e?.message || String(e);
      await client.query(
        `UPDATE generation_steps SET status = 'failed', error = $2, completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [stepId, message]
      );
      await client.query(
        `UPDATE generation_jobs SET status = 'failed', error = $2, updated_at = NOW() WHERE id = $1`,
        [jobId, message]
      );
      await client.query(`UPDATE projects SET status = 'failed', updated_at = NOW() WHERE id = $1`, [projectId]);
      context.error(`[GenerationJobWorker] Step failed: ${stepType} (${stepId})`, e);
    }
  });

  if (shouldRequeue) {
    context.extraOutputs.set(jobQueueOutput, JSON.stringify({ jobId }));
    context.log(`[GenerationJobWorker] Re-queued jobId=${jobId} for next step`);
  }
}

app.storageQueue('generationJobWorker', {
  queueName: 'generation-jobs',
  connection: 'AzureWebJobsStorage',
  handler: generationJobWorker,
  extraOutputs: [jobQueueOutput],
});

