# 코스 상세 페이지 개선 및 ChatGPT 결과 표시 문제 해결

**날짜**: 2026-01-03
**작업**: CourseDetail 페이지 기능 개선 및 ChatGPT 결과 표시 문제 해결
**작업자**: Claude Code

---

## 작업 개요

코스 상세 페이지(`CourseDetail.tsx`)에 모듈/레슨 선택 기능을 추가하고, ChatGPT로 생성된 결과가 표시되지 않는 문제를 해결하기 위한 작업을 진행했습니다.

### 주요 목표
1. ✅ `getLessonDetail` API 수정 - `project_stages` 테이블 조회 추가
2. ✅ CourseDetail 페이지 생성 - 코스 결과물 표시 페이지 추가
3. ✅ 모듈/레슨 선택 기능 추가
4. ✅ ChatGPT 결과 표시 문제 해결 시도
5. ✅ 인포그래픽 자동 디자인 개선
6. ✅ 디버깅 로그 강화

---

## 수정된 파일

### 1. `azure-functions/src/functions/getLessonDetail.ts`

#### 문제 발견 및 해결
- **문제**: 
  - `processDocument` API는 `project_stages` 테이블에 결과를 저장함
  - `getLessonDetail` API는 `project_ai_results` 테이블에서만 조회함
  - 결과적으로 레슨에서 생성한 콘텐츠가 표시되지 않음

- **해결**:
  ```typescript
  // project_stages 테이블에서도 조회 (processDocument가 이 테이블에 저장함)
  stages = await query(
    `SELECT * FROM project_stages WHERE project_id = $1 ORDER BY order_index ASC`,
    [lesson.project_id]
  );

  // aiResults가 비어있고 stages가 있으면, stages를 aiResults 형태로 변환
  if (aiResults.length === 0 && stages.length > 0) {
    const aiModel = project.ai_model || 'gemini';
    const combinedContent = stages.map((s: any) => 
      `## ${s.stage_name || `단계 ${s.order_index + 1}`}\n\n${s.content || '(내용 없음)'}`
    ).join('\n\n---\n\n');

    aiResults = [{
      id: `stage-result-${lesson.project_id}`,
      project_id: lesson.project_id,
      ai_model: aiModel,
      status: stages.every((s: any) => s.status === 'completed') ? 'completed' : 'processing',
      generated_content: combinedContent,
      created_at: stages[0]?.created_at || new Date().toISOString(),
      updated_at: stages[stages.length - 1]?.updated_at || new Date().toISOString(),
    }];
  }
  ```

- **변경 사항**:
  - `project_stages` 테이블에서 stages 조회 추가
  - `stages`를 응답에 포함하여 반환
  - 하위 호환성을 위해 `aiResults`가 없을 때 `stages`를 변환하여 제공

### 2. `src/pages/CourseDetail.tsx` (신규 생성)

#### 코스 상세 페이지 생성
- **목적**: 프로젝트 상세 페이지와 동일하게 코스의 파이프라인 단계, 인포그래픽, 최종 결과물을 볼 수 있는 페이지
- **기능**:
  - 코스 정보 표시 (제목, 설명, 레벨, 대상, 기간)
  - 파이프라인 단계 탭: 모든 레슨의 stages를 모델별로 표시
  - 인포그래픽 탭: 모든 레슨의 콘텐츠를 통합하여 인포그래픽 생성
  - 최종 결과물 탭: 모든 레슨의 콘텐츠를 통합하여 표시
  - AI 모델 선택: Gemini, Claude, ChatGPT 중 선택
  - 모듈/레슨 선택: 특정 모듈/레슨의 결과만 필터링하여 표시

#### 초기 구현
- 코스 정보 가져오기 (`getCourse` API)
- 모든 모듈과 레슨 가져오기 (`getModulesWithLessons` API)
- 각 레슨의 프로젝트 정보 가져오기 (`getProjectDetail` API)
- 모든 프로젝트의 stages 통합하여 표시

### 3. `src/pages/CourseDetail.tsx` (모듈/레슨 선택 기능 추가)

#### 모듈/레슨 선택 기능 추가
- **상태 추가**:
  ```typescript
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  ```

- **모듈/레슨 선택 UI 추가**:
  - 모듈 선택 드롭다운: 전체 모듈 또는 특정 모듈 선택
  - 레슨 선택 드롭다운: 선택된 모듈의 레슨만 표시
  - 모듈 변경 시 레슨 선택 자동 초기화

- **필터링 로직 개선**:
  ```typescript
  // 선택된 모듈의 레슨 목록
  const availableLessons = useMemo(() => {
    if (!selectedModuleId) return lessons;
    const module = modules.find(m => m.id === selectedModuleId);
    return module ? module.lessons : [];
  }, [selectedModuleId, modules, lessons]);

  // 선택된 AI 모델, 모듈, 레슨에 맞는 stages 필터링
  const filteredStages = useMemo(() => {
    // AI 모델 필터링
    // 모듈 필터링
    // 레슨 필터링
  }, [allStages, selectedAiModel, selectedModuleId, selectedLessonId, modules, lessons]);
  ```

#### ChatGPT 결과 표시 문제 해결 시도
- **모든 stages 가져오기 로직 개선**:
  - `getProjectDetail` API 대신 `getProjectStages` API를 사용하여 모든 AI 모델의 stages 포함
  - `aiModel` 파라미터 없이 호출하여 모든 stages 가져오기

- **필터링 로직 강화**:
  ```typescript
  // ChatGPT 관련 변형들 (더 포괄적으로)
  else if (selectedModel === 'chatgpt') {
    matchesModel = stageModel === 'chatgpt' || 
                  stageModel === 'gpt-4' || 
                  stageModel === 'gpt-3.5' ||
                  stageModel === 'gpt-4o' ||
                  stageModel === 'gpt-4o-mini' ||
                  stageModel.startsWith('gpt') ||
                  stageModel.includes('gpt') ||
                  stageModel.includes('chat');
  }
  ```

- **디버깅 로그 추가**:
  - 각 프로젝트의 stages 상세 정보 로그
  - 전체 stages 요약 로그
  - ChatGPT 관련 stages 확인 로그
  - 각 stage의 필터링 과정 상세 로그

#### 모듈/레슨 정보 표시
- 각 stage에 모듈/레슨 정보 표시:
  ```typescript
  const getLessonAndModuleForStage = (stage: ProjectStage) => {
    const lesson = lessons.find(l => l.project_id === stage.project_id);
    if (!lesson) return { lesson: null, module: null };
    
    const module = modules.find(m => m.lessons.some(l => l.id === lesson.id));
    return { lesson, module };
  };
  ```

- 파이프라인 단계 탭에서 모듈/레슨 정보 표시:
  - "모듈 X: [모듈 제목] - 레슨 Y: [레슨 제목]"
  - Badge로 모듈, 레슨, 프로젝트 정보 표시

- 최종 결과물 탭에서도 모듈/레슨 정보 포함

### 4. `src/components/InfographicPreview.tsx`

#### ChatGPT 필터링 로직 개선
- `finalContent` 생성 시 ChatGPT 필터링 로직 강화:
  ```typescript
  // ChatGPT 관련 변형들 (대소문자 구분 없이, 다양한 형식 지원)
  const normalizedAiModel = aiModel.toLowerCase();
  const filteredStages = stages.filter(s => {
    const stageModel = s.ai_model?.toLowerCase() || '';
    let matchesModel = false;
    
    // 정확한 매칭
    if (stageModel === normalizedAiModel) {
      matchesModel = true;
    }
    // ChatGPT 관련 변형들
    else if (normalizedAiModel === 'chatgpt') {
      matchesModel = stageModel === 'chatgpt' || 
                    stageModel === 'gpt-4' || 
                    stageModel === 'gpt-3.5' ||
                    stageModel === 'gpt-4o' ||
                    stageModel === 'gpt-4o-mini' ||
                    stageModel.includes('gpt');
    }
    // ...
  });
  ```

#### 인포그래픽 자동 디자인
- 내용에 따라 동적으로 아이콘과 색상 선택:
  - 단계 수에 따라 동적으로 아이콘 할당
  - 평가 방법 개수에 따라 비율 자동 계산
  - 내용 구조에 따라 레이아웃 자동 조정

### 5. `src/pages/CoursesPage.tsx`

#### "보기" 버튼 추가
- 코스 카드에 "보기" 버튼 추가
- 클릭 시 `/courses/${course.id}/detail`로 이동하여 CourseDetail 페이지 표시
- 버튼 레이아웃 조정: `flex-wrap` 추가하여 작은 화면에서도 버튼이 보이도록 함

### 6. `src/pages/Dashboard.tsx`

#### "보기" 버튼 추가
- "내 코스" 탭의 코스 카드에 "보기" 버튼 추가
- 클릭 시 `/courses/${course.id}/detail`로 이동하여 CourseDetail 페이지 표시
- 버튼 레이아웃 조정: `flex-wrap` 추가하여 작은 화면에서도 버튼이 보이도록 함

### 7. `src/pages/CourseBuilderPage.tsx`

#### "코스 목록" 버튼 수정
- "코스 목록" 버튼 클릭 시 `/courses` 대신 `/dashboard?tab=courses`로 이동하도록 수정
- 대시보드의 "내 코스" 탭으로 직접 이동하여 일관된 사용자 경험 제공

### 8. `src/App.tsx`

#### CourseDetail 라우트 추가
- `/courses/:id/detail` 경로 추가
- CourseDetail 컴포넌트를 라우트에 등록

### 9. `azure-functions/src/functions/getProjectStages.ts`

#### 디버깅 로그 추가
- `aiModel` 파라미터 없이 호출 시 모든 stages 정보 로그:
  ```typescript
  context.log(`[GetProjectStages] Found ${stages.length} total stages for project ${projectId} (no aiModel filter)`);
  if (stages.length > 0) {
    const aiModels = [...new Set(stages.map(s => s.ai_model || 'NULL'))];
    context.log(`[GetProjectStages] Available ai_model values (all stages): ${aiModels.join(', ')}`);
    
    // 각 ai_model별 개수 로그
    const modelCounts = stages.reduce((acc, s) => {
      const model = s.ai_model || 'NULL';
      acc[model] = (acc[model] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    context.log(`[GetProjectStages] Stage count by model:`, JSON.stringify(modelCounts));
  }
  ```

---

## 작업 순서

1. **getLessonDetail API 수정** - `project_stages` 테이블 조회 추가
2. **CourseDetail 페이지 생성** - 코스 결과물 표시 페이지 신규 생성
3. **CoursesPage/Dashboard에 "보기" 버튼 추가** - CourseDetail 페이지로 이동하는 버튼 추가
4. **CourseBuilderPage "코스 목록" 버튼 수정** - 대시보드의 "내 코스" 탭으로 이동하도록 수정
5. **모듈/레슨 선택 기능 추가** - CourseDetail 페이지에 모듈/레슨 필터링 기능 추가
6. **ChatGPT 결과 표시 문제 해결 시도** - 필터링 로직 개선 및 디버깅 로그 추가

## 주요 변경 사항

### 1. getLessonDetail API 수정
- **문제**: `processDocument`는 `project_stages` 테이블에 저장하지만, `getLessonDetail`는 `project_ai_results` 테이블에서만 조회
- **해결**: `project_stages` 테이블도 함께 조회하도록 수정
- **영향**: 레슨에서 생성한 콘텐츠가 정상적으로 표시됨

### 2. CourseDetail 페이지 생성
- **목적**: 코스의 모든 레슨 결과를 통합하여 표시
- **기능**:
  - 파이프라인 단계: 모든 레슨의 stages를 모델별로 표시
  - 인포그래픽: 모든 레슨의 콘텐츠를 통합하여 인포그래픽 생성
  - 최종 결과물: 모든 레슨의 콘텐츠를 통합하여 표시
- **라우팅**: `/courses/:id/detail` 경로 추가

### 3. 모듈/레슨 선택 기능
- **목적**: 코스의 구조화된 모듈/레슨 구조에 따라 결과를 필터링하여 볼 수 있도록 함
- **구현**:
  - 모듈 선택 드롭다운 추가
  - 레슨 선택 드롭다운 추가 (모듈 선택 시 활성화)
  - 선택된 모듈/레슨에 해당하는 stages만 필터링하여 표시

### 4. ChatGPT 결과 표시 문제 해결 시도
- **문제**: ChatGPT로 생성된 결과가 CourseDetail 페이지에서 표시되지 않음
- **원인 분석**:
  - `getProjectDetail` API가 프로젝트의 기본 `ai_model`로만 필터링하여 ChatGPT로 재시도한 stages를 가져오지 못함
  - 필터링 로직이 ChatGPT 관련 변형을 제대로 인식하지 못함
- **해결 시도**:
  - `getProjectStages` API를 사용하여 모든 stages 가져오기
  - ChatGPT 필터링 로직 강화 (다양한 변형 지원)
  - 디버깅 로그 추가하여 실제 저장된 `ai_model` 값 확인

### 5. 인포그래픽 자동 디자인
- **목적**: 내용에 따라 인포그래픽 레이아웃이 자동으로 조정되도록 함
- **구현**:
  - 단계 수에 따라 동적으로 아이콘과 색상 할당
  - 평가 방법 개수에 따라 비율 자동 계산
  - 내용 구조에 따라 레이아웃 자동 조정

---

## 디버깅 로그

### 프론트엔드 로그
- `[CourseDetail] Fetched X stages for project {projectId}` - 각 프로젝트의 stages 개수
- `[CourseDetail] Available ai_model values for project {projectId}:` - 각 프로젝트의 AI 모델 값들
- `[CourseDetail] Stage X for project {projectId}:` - 각 stage의 상세 정보
- `[CourseDetail] ===== STAGES SUMMARY =====` - 전체 stages 요약
- `[CourseDetail] ChatGPT-related stages found:` - ChatGPT stages 개수
- `[CourseDetail] ⚠️ No ChatGPT stages found!` - ChatGPT stages가 없을 때 경고
- `[CourseDetail] Stage check:` - 각 stage의 필터링 과정

### 백엔드 로그 (Azure Functions)
- `[GetProjectStages] Found X total stages for project {projectId} (no aiModel filter)` - 전체 stages 개수
- `[GetProjectStages] Available ai_model values (all stages):` - 사용 가능한 AI 모델 값들
- `[GetProjectStages] Stage count by model:` - 모델별 stage 개수

---

## 남은 문제

### ChatGPT 결과 표시 문제
- **현재 상태**: 여전히 ChatGPT로 생성된 결과가 표시되지 않음
- **로그 분석**:
  - 모든 stages의 `ai_model`이 "gemini"로만 표시됨
  - ChatGPT로 생성된 stages가 실제로 DB에 저장되지 않았을 가능성
- **다음 단계**:
  1. 실제 DB에 ChatGPT stages가 있는지 확인 필요
  2. `processDocument` API가 ChatGPT로 생성 시 `ai_model`을 올바르게 저장하는지 확인 필요
  3. LessonDetailPane에서 ChatGPT로 생성한 stages가 실제로 저장되었는지 확인 필요

---

## 테스트 방법

### 1. 모듈/레슨 선택 기능 테스트
1. 코스 상세 페이지 접근
2. 우측 상단에서 모듈 선택 드롭다운 확인
3. 모듈 선택 시 레슨 선택 드롭다운 활성화 확인
4. 모듈/레슨 선택 시 해당하는 stages만 표시되는지 확인

### 2. ChatGPT 결과 표시 테스트
1. 콘솔 로그 확인:
   - `[CourseDetail] ===== STAGES SUMMARY =====` 로그 확인
   - `[CourseDetail] ChatGPT-related stages found:` 로그 확인
   - 실제 저장된 `ai_model` 값 확인
2. ChatGPT 선택 시 결과가 표시되는지 확인
3. 만약 표시되지 않으면, 실제 DB에 ChatGPT stages가 있는지 확인

---

## 참고 사항

- ChatGPT 결과 표시 문제는 실제 DB에 ChatGPT stages가 저장되지 않았을 가능성이 높음
- 디버깅 로그를 통해 실제 저장된 `ai_model` 값을 확인할 수 있음
- Azure Functions 로그도 확인하여 백엔드에서 stages를 올바르게 가져오는지 확인 필요

---

## 다음 작업

1. 실제 DB에 ChatGPT stages가 있는지 확인
2. `processDocument` API가 ChatGPT로 생성 시 `ai_model`을 올바르게 저장하는지 확인
3. LessonDetailPane에서 ChatGPT로 생성한 stages가 실제로 저장되었는지 확인
4. 필요시 `processDocument` API 수정

