# 2026-01-13 슬라이드(PPTX) 기능 PRD 반영 보강

## 배경
- `docs/AI-Presentation-Generator-PRD.md` 문서가 추가되었고, 그 요구사항 중 **"슬라이드 장수(3~15) 선택"**, **"템플릿 선택"**, **"PPTX 다운로드"**를 현재 코드 구조(React + Azure Functions(Node/TS) + Postgres + Agent Job)에서 충실히 반영해야 했습니다.
- PRD는 Python/FastAPI/python-pptx/Celery 기반 예시를 포함하지만, 본 프로젝트는 기존 구조를 유지하기 위해 **프론트에서 `pptxgenjs`로 PPTX를 생성**하는 방식을 유지/확장했습니다.

## 변경 요약
### 1) 슬라이드 생성 옵션(장수/템플릿) 추가
- **프론트**: `src/components/BriefWizard.tsx`
  - 산출물에서 `교안 슬라이드`를 선택하면 아래 옵션이 추가로 노출됨
    - 슬라이드 장수: 3~15
    - PPTX 템플릿: `default | minimal | creative`
- **백엔드**: `azure-functions/src/functions/startGenerationJob.ts`
  - `options.slides` 값을 정규화/검증 후 `generation_jobs.options`에 저장
- **워커**: `azure-functions/src/functions/generationJobWorker.ts`
  - `options.slides.slideCount`가 있으면 슬라이드 생성 시 해당 값을 우선 사용
  - `options.slides.template`를 프롬프트에 힌트로 포함하여 톤 반영

### 2) PPTX 다운로드 템플릿 선택 UI 추가
- **프론트**: `src/pages/GenerationStudioPage.tsx`
  - 상단 툴바에 `PPT 템플릿` 선택 UI를 추가하고,
  - 다운로드(`슬라이드 만들기 (PPTX)`) 시 선택된 템플릿을 `generatePptxBlob()`에 전달

### 3) 옵션 유틸/테스트 추가
- **백엔드 유틸**: `azure-functions/src/lib/agent/slidesOptions.ts`
  - `sanitizeSlidesOptions()` / `resolveSlideCount()` / `resolveTemplate()`
- **테스트**: `azure-functions/test/slidesOptions.test.ts`

## 로컬 테스트 가이드(요약)
1. 프로젝트 생성(`ProjectCreate`) → BriefWizard에서 **교안 슬라이드 체크**
2. 슬라이드 옵션에서 **장수/템플릿 선택**
3. 생성 완료 후 Studio에서 **다운로드 → 슬라이드 만들기(PPTX)**
4. PPTX 열어서 다음 확인
   - 슬라이드 수가 선택값에 근접/일치하는지(모델 출력 특성상 ±1 가능)
   - 발표자 노트(speaker notes) 포함 여부
   - 마지막에 Sources 페이지가 포함되는지(출처가 있으면)

## 참고/출처(외부)
- PptxGenJS: `https://github.com/gitbrent/PptxGenJS`

