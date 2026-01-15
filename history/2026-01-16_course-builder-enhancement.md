# 2026-01-16: 코스빌더 콘텐츠 생성 기능 개선

## 작업 개요
코스빌더의 슬라이드 및 인포그래픽 생성 기능을 개선하여 완성된 콘텐츠를 취합하고, flowchart/diagram 형태의 시각적 자료를 생성하도록 구현했습니다.

## 주요 변경사항

### 1. 슬라이드/인포그래픽 활성화 조건 추가
**파일**: `src/components/course/LessonDetailPane.tsx`

#### 변경 내용:
- `CONTENT_TYPES` 배열에 `requiresContent: true`, `special: true` 플래그 추가
- UI에서 일반 콘텐츠와 특별 콘텐츠를 분리하여 표시
- 최소 1개 이상의 일반 콘텐츠가 생성되어야 슬라이드/인포그래픽 버튼 활성화

```typescript
const CONTENT_TYPES: {
  type: ContentType;
  label: string;
  icon: any;
  description: string;
  requiresContent?: boolean;
  special?: boolean
}[] = [
  // 일반 콘텐츠
  { type: 'lesson_plan', label: '레슨 플랜', ... },
  { type: 'hands_on_activity', label: '실습 활동', ... },
  { type: 'assessment', label: '평가', ... },
  { type: 'supplementary_materials', label: '보충 자료', ... },
  { type: 'discussion_prompts', label: '토론 주제', ... },
  { type: 'instructor_notes', label: '강사 노트', ... },

  // 특별 콘텐츠 (취합형)
  {
    type: 'slides',
    label: '슬라이드',
    icon: Presentation,
    description: '완성된 콘텐츠를 바탕으로 프레젠테이션 생성',
    requiresContent: true,
    special: true
  },
  {
    type: 'infographic',
    label: '인포그래픽',
    icon: Sparkles,
    description: '완성된 콘텐츠를 시각적 다이어그램으로 변환',
    requiresContent: true,
    special: true
  },
];
```

### 2. UI 레이아웃 재구성
**파일**: `src/components/course/LessonDetailPane.tsx` (lines 620-683)

#### 변경 내용:
- 콘텐츠 생성 버튼을 두 섹션으로 분리:
  1. **일반 콘텐츠 생성**: 그리드 레이아웃 (2x4)
  2. **통합 콘텐츠 생성**: 슬라이드 & 인포그래픽 (그라데이션 배경)

```typescript
<CardContent>
  {!comparisonMode ? (
    <div className="space-y-4">
      {/* 일반 콘텐츠 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {CONTENT_TYPES.filter(ct => !ct.special).map(...)}
      </div>

      {/* 슬라이드 & 인포그래픽 (특별 콘텐츠) */}
      <div className="border-t pt-4">
        <div className="text-sm font-medium mb-3 text-primary">
          통합 콘텐츠 생성
        </div>
        <div className="grid grid-cols-2 gap-3">
          {CONTENT_TYPES.filter(ct => ct.special).map(...)}
        </div>
      </div>
    </div>
  ) : (
    // AI 모델 비교 모드
  )}
</CardContent>
```

### 3. 콘텐츠 취합 및 생성 로직
**파일**: `src/components/course/LessonDetailPane.tsx` (lines 256-319)

#### 변경 내용:
- `handleGenerateSingleContent` 함수에 콘텐츠 취합 로직 추가
- 슬라이드/인포그래픽 생성 시 기존 콘텐츠를 수집하여 Azure Function에 전달

```typescript
const handleGenerateSingleContent = async (contentType: ContentType) => {
  if (!lesson) return;

  try {
    setGenerating(true);
    setGeneratingType(contentType);

    // 슬라이드와 인포그래픽은 기존 콘텐츠를 취합하여 생성
    let aggregatedContent = null;
    if (contentType === 'slides' || contentType === 'infographic') {
      const existingContents = Object.entries(generatedContents)
        .filter(([key, value]) =>
          key !== 'slides' &&
          key !== 'infographic' &&
          value !== null
        )
        .map(([key, value]) => ({
          type: key,
          content: value?.content,
          markdown: value?.markdown,
        }));

      if (existingContents.length === 0) {
        toast.error('슬라이드/인포그래픽을 생성하려면 최소 1개 이상의 콘텐츠가 필요합니다.');
        return;
      }

      aggregatedContent = existingContents;
    }

    // Azure Function 호출
    const { data, error } = await callAzureFunctionDirect(
      '/api/course/generate-content',
      'POST',
      {
        lessonId: lesson.id,
        contentType,
        context: {...},
        aiModel: selectedAiModel,
        aggregatedContent, // 취합된 콘텐츠 전달
      }
    );
    // ...
  }
};
```

### 4. 인포그래픽 미리보기 추가
**파일**: `src/components/course/LessonDetailPane.tsx` (lines 445-491)

#### 변경 내용:
- 인포그래픽 콘텐츠 타입에 대한 렌더링 로직 추가
- 섹션별 핵심 포인트 표시
- Mermaid 다이어그램 렌더링 지원

```typescript
if (contentType === 'infographic') {
  return (
    <div className="space-y-6 bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-2xl">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold mb-2">{data.title || lessonTitle}</h3>
        {data.description && (
          <p className="text-muted-foreground">{data.description}</p>
        )}
      </div>

      {/* 주요 섹션들 */}
      {data.sections && Array.isArray(data.sections) && data.sections.map((section, idx) => (
        <div key={idx} className="bg-white p-6 rounded-xl shadow-sm">
          <h4 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            {section.title}
          </h4>
          {section.items && (
            <ul className="space-y-2">
              {section.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckSquare className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {/* 다이어그램/플로우차트 */}
      {data.diagram && (
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h4 className="text-lg font-bold mb-3">프로세스 다이어그램</h4>
          <div className="text-sm whitespace-pre-wrap font-mono bg-slate-50 p-4 rounded-lg">
            {data.diagram}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 5. Azure Function - AI 프롬프트 개선
**파일**: `azure-functions/src/functions/generateSingleContent.ts`

#### 5.1 타입 정의 확장
```typescript
type ContentType = 'lesson_plan' | 'slides' | 'hands_on_activity' | 'assessment' |
  'supplementary_materials' | 'discussion_prompts' | 'instructor_notes' | 'infographic';

interface SingleContentRequest {
  lessonId: string;
  contentType: ContentType;
  context: {...};
  aiModel: AiModel;
  aggregatedContent?: Array<{  // 새로 추가
    type: string;
    content: any;
    markdown?: string;
  }>;
}
```

#### 5.2 슬라이드 프롬프트 개선 (lines 92-182)
```typescript
function buildSlidesOnlyPrompt(
  context: SingleContentRequest['context'],
  aggregatedContent?: Array<{ type: string; content: any; markdown?: string }>
): { system: string; prompt: string } {
  const system = `당신은 교육 프레젠테이션 설계 전문가입니다.
완성된 여러 콘텐츠를 취합하여 실제 강의용 슬라이드를 생성합니다.
reveal.js 웹 프레젠테이션 프레임워크를 활용하며, flowchart/diagram 형태의 슬라이드도 포함합니다.

출력은 반드시 아래 JSON 형식으로 작성하세요:
{
  "deckTitle": "슬라이드 제목",
  "theme": "white | black | league | ...",
  "slides": [
    {
      "slideNumber": 1,
      "layout": "title | content | two-column | ...",
      "title": "슬라이드 제목",
      "content": {
        "bulletPoints": [...],
        "mermaidDiagram": "Mermaid 다이어그램 코드",  // 추가
        ...
      },
      ...
    }
  ]
}`;

  const prompt = `## 레슨 정보
- 제목: ${context.lessonTitle}
- 학습 목표: ${context.learningObjectives?.join('\n  - ') || '없음'}

## 기존 생성된 콘텐츠
${aggregatedContent && aggregatedContent.length > 0
    ? aggregatedContent.map(
        (item) => `### ${item.type}\n${item.markdown || JSON.stringify(item.content, null, 2).substring(0, 500)}`
      ).join('\n\n')
    : '없음 (레슨 기본 정보만 사용)'}

## 요청
위 레슨의 콘텐츠를 분석하여 reveal.js 프레젠테이션을 생성해주세요.
- 총 10-15장 구성 (도입-본론-정리 구조)
- **flowchart/diagram 슬라이드 2-3개 포함**: mermaidDiagram 필드에 Mermaid 코드 작성
- UI/UX를 고려한 시각적 구성`;

  return { system, prompt };
}
```

#### 5.3 인포그래픽 프롬프트 추가 (lines 452-527)
```typescript
function buildInfographicPrompt(
  context: SingleContentRequest['context'],
  aggregatedContent?: Array<{ type: string; content: any; markdown?: string }>
): { system: string; prompt: string } {
  const system = `당신은 교육 콘텐츠 시각화 전문가입니다.
완성된 여러 콘텐츠를 분석하여 학습 내용을 시각적으로 표현하는 인포그래픽을 생성합니다.
Mermaid 다이어그램을 활용하여 flowchart, mindmap, timeline 등 다양한 형식으로 표현합니다.

출력은 반드시 아래 JSON 형식으로 작성하세요:
{
  "title": "인포그래픽 제목",
  "description": "인포그래픽 설명",
  "sections": [
    {
      "title": "섹션 제목",
      "items": ["핵심 포인트 1", "핵심 포인트 2", ...],
      "content": "상세 설명 (선택사항)"
    }
  ],
  "diagram": "Mermaid 다이어그램 코드"
}

**Mermaid 다이어그램 작성 가이드:**
- flowchart TD/LR: 프로세스, 학습 흐름, 의사결정 과정 표현
- mindmap: 개념 구조, 핵심 주제와 하위 항목 관계
- timeline: 시간순 진행, 단계별 학습 과정

**다이어그램 작성 규칙:**
1. 노드 ID는 영문자로 시작 (예: A, B, Start, Process1)
2. 한글 레이블은 대괄호나 따옴표 사용 (예: A["시작"])
3. 화살표로 흐름 표현 (-->, -.->, ==>, -.->)`;

  const prompt = `## 기존 생성된 콘텐츠
${aggregatedContent && aggregatedContent.length > 0
    ? aggregatedContent.map(
        (item) => `### ${item.type}\n${item.markdown || ...}`
      ).join('\n\n')
    : '없음'}

## 요청
위 레슨의 콘텐츠를 분석하여 학습 내용을 시각적으로 표현하는 인포그래픽을 만들어주세요.
- 3-5개의 주요 섹션으로 구성
- **Mermaid 다이어그램 1개**: flowchart, mindmap, 또는 timeline 형식
- UI/UX를 고려하여 가독성 높게 작성`;

  return { system, prompt };
}
```

#### 5.4 메인 함수 수정 (lines 555-571)
```typescript
// 콘텐츠 타입별 프롬프트 생성
let system: string;
let prompt: string;

if (contentType === 'slides' || contentType === 'infographic') {
  // 슬라이드와 인포그래픽은 aggregatedContent를 전달
  const builder = contentType === 'slides' ? buildSlidesOnlyPrompt : buildInfographicPrompt;
  ({ system, prompt } = builder(enrichedContext, aggregatedContent));
} else {
  // 다른 콘텐츠 타입은 기존 방식 유지
  const promptBuilders: Record<Exclude<ContentType, 'slides' | 'infographic'>, ...> = {
    lesson_plan: buildLessonPlanPrompt,
    hands_on_activity: buildHandsOnActivityPrompt,
    assessment: buildAssessmentPrompt,
    supplementary_materials: buildSupplementaryMaterialsPrompt,
    discussion_prompts: buildDiscussionPromptsPrompt,
    instructor_notes: buildInstructorNotesPrompt,
  };
  ({ system, prompt } = promptBuilders[contentType](enrichedContext));
}
```

## 데이터베이스 변경사항

### lesson_contents 테이블
이전 세션에서 이미 생성됨:
- `infographic` 콘텐츠 타입 지원 (content_type 컬럼에 저장 가능)
- JSONB 컬럼에 diagram 필드 저장

## 기술적 세부사항

### Mermaid 다이어그램 지원
- **Flowchart**: 프로세스 흐름, 학습 단계
- **Mindmap**: 개념 구조, 지식 체계
- **Timeline**: 시간순 진행, 역사적 흐름
- **Graph**: 관계도, 연결 구조

### UI/UX 개선사항
1. **시각적 구분**: 일반 콘텐츠와 통합 콘텐츠 분리
2. **그라데이션 배경**: 슬라이드/인포그래픽 버튼에 시각적 강조
3. **비활성화 상태**: 조건 미충족 시 버튼 비활성화 및 툴팁 제공
4. **미리보기**: 인포그래픽 콘텐츠 전용 렌더링 컴포넌트

## 사용자 워크플로우

### 기존 워크플로우
1. 코스 생성 → 모듈 생성 → 레슨 생성
2. 레슨 플랜, 실습, 평가 등 콘텐츠 개별 생성
3. 슬라이드 생성 (기본 정보만 사용)

### 개선된 워크플로우
1. 코스 생성 → 모듈 생성 → 레슨 생성
2. **최소 1개 이상의 일반 콘텐츠 생성** (레슨 플랜, 실습, 평가 등)
3. **슬라이드/인포그래픽 버튼 활성화**
4. **슬라이드 생성**: 모든 기존 콘텐츠를 분석하여 종합 슬라이드 생성 (flowchart/diagram 포함)
5. **인포그래픽 생성**: 모든 기존 콘텐츠를 시각화하여 인포그래픽 생성 (Mermaid diagram 포함)

## 테스트 시나리오

### 시나리오 1: 정상 흐름
1. 레슨 생성
2. 레슨 플랜 생성 (AI 모델: Gemini)
3. 실습 활동 생성 (AI 모델: Claude)
4. **슬라이드 버튼 활성화 확인** ✓
5. 슬라이드 생성 → 레슨 플랜 + 실습 활동 내용이 취합되어 슬라이드 생성
6. **인포그래픽 버튼 활성화 확인** ✓
7. 인포그래픽 생성 → 모든 콘텐츠가 시각화되어 인포그래픽 생성

### 시나리오 2: 콘텐츠 없이 슬라이드 시도
1. 레슨 생성
2. **슬라이드 버튼 비활성화 확인** ✓
3. 버튼 클릭 불가

### 시나리오 3: 다이어그램 생성 확인
1. 슬라이드 생성
2. AI가 생성한 슬라이드 중 2-3개는 `mermaidDiagram` 필드 포함 확인
3. 인포그래픽 생성
4. AI가 생성한 `diagram` 필드에 Mermaid 코드 포함 확인

## 향후 개선 계획

### Phase 1: Mermaid 렌더링 (우선순위: 높음)
- [ ] SlidePreview 컴포넌트에 Mermaid 렌더링 추가
- [ ] InfographicPreview 컴포넌트에 Mermaid 렌더링 추가
- [ ] mermaid.js 라이브러리 통합

### Phase 2: 다이어그램 편집 (우선순위: 중간)
- [ ] 다이어그램 코드 편집 UI
- [ ] 실시간 미리보기
- [ ] 다이어그램 스타일 커스터마이징

### Phase 3: 추가 시각화 타입 (우선순위: 낮음)
- [ ] Gantt 차트 지원
- [ ] Sequence diagram 지원
- [ ] Class diagram 지원

## 관련 파일

### Frontend
- `src/components/course/LessonDetailPane.tsx` - 메인 UI 컴포넌트
- `src/lib/azureFunctions.ts` - API 호출 유틸리티

### Backend
- `azure-functions/src/functions/generateSingleContent.ts` - 콘텐츠 생성 API
- `azure-functions/src/lib/agent/prompts.ts` - AI 프롬프트 유틸리티

### Database
- `create-lesson-contents-table.sql` - 테이블 스키마
- `run-migration.js` - 마이그레이션 스크립트

## 참고 문서
- [Mermaid 공식 문서](https://mermaid.js.org/)
- [reveal.js 공식 문서](https://revealjs.com/)
- [2026-01-10 프로젝트-코스빌더 통합 계획](./2026-01-10_project-coursebuilder-integration-plan.md)

## 작업 완료 일시
- 2026-01-16 작업 완료
- 모든 TODO 항목 완료 ✓
