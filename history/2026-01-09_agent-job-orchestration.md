# 2026-01-09 Agent 기반 생성 Job 오케스트레이션 (문서/인포그래픽/슬라이드)

## 배경 / 문제
- 기존 `processDocument` 중심의 동기식 처리 흐름은 장시간 작업/중간 진행상황 표시/부분 산출물 프리뷰에 취약.
- 사용자 요구사항:
  - 입력 단계에서 **산출물(강의안/인포그래픽/슬라이드) 복수 선택**
  - 선택한 산출물에 대해 **웹 검색(최신 내용 반영)**, **이미지 생성(배경/삽화/다이어그램)** 옵션 적용
  - UI는 **좌측: 해석/진행 로그**, **우측: 캔버스 프리뷰** 형태

## 변경 요약 (아키텍처)
- **Job 기반 비동기 처리**로 전환
  - `generation_jobs`: 작업 단위(Job)
  - `generation_steps`: 단계 단위(Step) 상태/로그
  - `generation_artifacts`: 산출물(문서/인포그래픽/슬라이드) 저장
- 실행 모델
  - `POST /api/generation/start` → job/steps/artifacts 생성 + queue(`generation-jobs`) enqueue
  - `generationJobWorker`(queue trigger) → pending step 1개 처리 → 남은 step이 있으면 **self-requeue** → 마지막 step 이후 job을 **completed**로 종료
  - `GET /api/generation/job/{projectId}` → 최신 job/steps/artifacts 조회 (Studio UI 폴링)

## 프론트 변경
- `BriefWizard`에 **산출물 체크박스 + 옵션(웹검색/이미지 생성)** 추가
- 프로젝트 생성 후 `processDocument` 대신 `startGenerationJob` 호출 및 `/project/:id/studio`로 이동
- `GenerationStudioPage` 추가
  - 좌측: 입력 원문 + Step 카드(상태/로그/에러)
  - 우측: Tabs 기반 프리뷰(강의안 Markdown 텍스트, 인포그래픽/슬라이드 JSON 임시 표시)

## 로컬 개발 편의 (DEV_AUTH_BYPASS)
- Entra 설정이 없는 환경에서도 E2E를 확인할 수 있도록 **개발 전용 bypass** 추가
  - Backend:
    - `AZURE_FUNCTIONS_ENVIRONMENT=Development` AND `DEV_AUTH_BYPASS=true` 일 때
    - `x-dev-user-id`(UUID) 헤더를 인증으로 인정
  - Frontend:
    - `VITE_DEV_AUTH_BYPASS=true` 시 Entra 로그인 없이 dev user로 동작
    - Azure Functions 호출 시 토큰이 없으면 `x-dev-*` 헤더 자동 부착

## 운영/보안 메모
- `DEV_AUTH_BYPASS`는 **Development 환경에서만** 허용하도록 제한 (프로덕션에서는 반드시 false)
- `runMigration`은 단일 스크립트를 한 번에 실행하도록 변경(세미콜론 split로 DO $$ 블록이 깨지는 문제 방지)

## Docker/환경 복구 사항(브랜치 기준 누락분 재적용)
- `docker-compose.yml`에서
  - `azurite` 이미지: `mcr.microsoft.com/azure-storage/azurite`
  - postgres healthcheck: `pg_isready -U ... -d ...`
  - 로컬 Postgres SSL 미지원 → `AZURE_POSTGRES_SSL=false` 기본
- `azure-functions/Dockerfile`: Node 20 기반 + 빌드 시 devDeps 설치 후 런타임은 prod deps만
- `Dockerfile.frontend`: Node 22 기반 + Linux optional deps 문제 회피

## 향후 작업
- `web_search` step: Tavily/Serper 기반 검색(옵션) + 출처를 `generation_steps.output.sources` 및 `generation_artifacts.assets.sources`에 저장
- `design_assets` step: OpenAI 이미지 생성(옵션, `OPENAI_API_KEY` 필요)으로 배경 이미지 생성 후 `generation_artifacts.assets.background`에 저장
- 프리뷰: 인포그래픽/슬라이드를 `<canvas>`로 렌더링 (배경/팔레트 반영, 출처 링크 표시)

## 2026-01-09 추가: 강제 인용(Forced Citation)
- 문서(`generate_document`)
  - 출처가 있으면 본문에 `[1]` 형태 인용을 포함하도록 **시스템 프롬프트 규칙 강화**
  - LLM 응답에 `## Sources`가 빠져도 서버가 **후처리로 Sources 섹션 자동 추가**
  - 출처가 없으면 `## Sources`에 **웹검색 미설정 안내**를 자동 추가
- 슬라이드(`generate_slides`)
  - 출처가 있으면 각 슬라이드 `speakerNotes`에 **최소 1개 이상의 `[n]` 인용 강제**
  - 출처가 없어도 `speakerNotes`에 `Sources: (웹 검색 결과 없음...)` **안내 문구 강제**(운영에서 키 미설정 시 빠른 진단용)

## 2026-01-09 Plan B: 슬라이드 Deck Sources 표준화 + UI 렌더링
- Backend
  - 슬라이드 산출물 JSON에 `sources: [{ id, title?, url }]`를 **항상 포함**하도록 표준화(출처가 없으면 빈 배열).
  - speakerNotes의 인용/안내는 유지하면서, UI가 deck-level sources를 단일 진실로 사용 가능.
- Frontend
  - Studio 슬라이드 탭에서 `slides.content_json.sources`를 우선 렌더링하고, 없을 때만 `web_search` step의 sources로 fallback.

## 2026-01-09 확장: 슬라이드 캔버스 Sources 페이지 자동 생성
- Backend
  - `citations.enforceSlideCitationsAndDeckSources()`에서 덱 마지막에 `title: "Sources"` 슬라이드를 자동 append.
  - 이미 `Sources/출처` 슬라이드가 있으면 중복 생성하지 않음.
- Frontend
  - 구버전 산출물(백엔드 append 전)도 보이도록, `SlidesCanvas`가 `data.sources` 기반으로 가상 Sources 슬라이드를 마지막에 추가해 렌더링.
