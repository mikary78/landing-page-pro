# 2026-02-04: 커버 이미지 생성 수정 및 대시보드 UI 개선

## Summary
- 프로젝트 커버 이미지가 생성되지 않는 문제 근본 원인 분석 및 수정
- OpenAI 이미지 생성 서비스 안정성 개선 (lazy initialization, 우선순위 변경)
- 대시보드 프로젝트 카드 UI를 생성예시 페이지 스타일로 개선
- 블로그 스타일 문서 뷰어 (StyledDocumentViewer) 컴포넌트 생성
- 인포그래픽 카드 뷰 (InfographicCardView) 컴포넌트 생성
- 코스빌더 슬라이드 데이터 정규화 로직 추가
- Azure Functions 및 Static Web Apps 배포 완료

## 변경 사항

### 1. 커버 이미지 생성 수정 (Backend)

#### `azure-functions/src/lib/image-generation.ts`
- OpenAI 클라이언트를 모듈 로드 시 즉시 생성하던 방식에서 **lazy initialization**으로 변경
  - 기존: `const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });` (모듈 최상위)
  - 변경: `getOpenAI()` 함수로 사용 시점에 생성
- API 호출 우선순위 변경: Vertex AI Imagen 우선 → **OpenAI DALL-E 3 우선**
- 상세 에러 로깅 추가 (HTTP Status, API Error 객체 등)

#### `azure-functions/src/functions/startGenerationJob.ts` (line 99)
- `enableImageGeneration` 기본값 수정
  - 기존: `!!options?.enableImageGeneration` (기본값 false)
  - 변경: `options?.enableImageGeneration !== false` (기본값 true)

#### `azure-functions/src/functions/generationJobWorker.ts` (line 756)
- 커버 아티팩트 저장 시 `markCompleted` 값 수정
  - 기존: `markCompleted: false`
  - 변경: `markCompleted: true`

#### `azure-functions/src/functions/generationChat.ts`
- SQL 쿼리 컬럼명 오류 수정: `content` → `content_text, content_json`
- 커버 이미지 재생성 지원 추가 (Target type에 'cover' 추가)

#### `azure-functions/src/functions/getProjects.ts`
- 커버 이미지 쿼리에 `AND ga.status = 'completed'` 필터 추가

### 2. 대시보드 UI 개선 (Frontend)

#### `src/pages/Dashboard.tsx`
- 프로젝트 카드를 생성예시(ExamplesPage) 스타일로 개선:
  - 커버 이미지 있는 경우: hover 시 확대 애니메이션 (`group-hover:scale-105`)
  - 커버 이미지 없는 경우: AI 모델별 이모지 + 컬러 그라디언트 배경
  - 카드 전체 클릭으로 스튜디오 이동
  - 상태 배지를 커버 이미지 위에 오버레이 표시
  - 향상된 호버 효과 (`hover:shadow-xl`, `group-hover:text-primary`)
  - 날짜 옆 Clock 아이콘 추가

### 3. 블로그 스타일 문서 뷰어 (신규)

#### `src/components/studio/StyledDocumentViewer.tsx` (신규 파일)
- ReactMarkdown + remarkGfm 기반 재사용 가능한 문서 뷰어
- 커스텀 렌더러: h1/h2 좌측 악센트바, 넓은 행간(1.8), 스타일된 테이블/blockquote
- 적용 대상: GenerationStudioPage 종합강의안 탭, LessonDetailPane 마크다운 콘텐츠

### 4. 인포그래픽 카드 뷰 (신규)

#### `src/components/studio/InfographicCardView.tsx` (신규 파일)
- Canvas 기반 InfographicCanvas를 HTML/CSS 카드 레이아웃으로 교체
- 가로 스크롤 가능한 섹션 카드 (snap scroll)
- palette 색상 활용한 카드 악센트바
- iconHint 기반 이모지 아이콘 매핑
- HTML 다운로드 기능 (자체 포함 HTML 파일, Noto Sans KR 폰트)
- 적용 대상: GenerationStudioPage 인포그래픽 탭, LessonDetailPane 인포그래픽 렌더링

### 5. 코스빌더 슬라이드 미리보기

#### `src/components/course/LessonDetailPane.tsx`
- 슬라이드 데이터 정규화 로직 추가 (문자열/deck-nested/standard 형식 대응)
- StyledDocumentViewer 및 InfographicCardView 통합

### 6. 프로젝트 파일 정리

#### `.gitignore` 업데이트
- `*.zip`, `*.tar.gz`, `deploy-ready/`, `node_modules_production/`, `azure-functions/dist/` 추가

#### 불필요한 파일/폴더 삭제
- `backend/` (사용하지 않는 FastAPI 스캐폴드)
- `services/` (마이크로서비스 실험 구조)
- `infrastructure/` (인프라 관련 리소스)
- `supabase/` (사용하지 않는 Edge Functions)
- 기타 로그/아카이브 파일

## 배포

| 대상 | 상태 | 비고 |
|------|------|------|
| Azure Functions | 42개 함수 정상 배포 | `func azure functionapp publish func-landing-page-pro --nozip` |
| Frontend (SWA) | 정상 배포 | `swa deploy ./dist` → `icy-forest-03cc7cb00.1.azurestaticapps.net` |

## 환경 확인

- OPENAI_API_KEY: Azure Function App 설정에 정상 등록 확인
- VERTEX_API_KEY, VERTEX_PROJECT_ID, VERTEX_LOCATION: Azure Function App 설정에 등록 확인
- Node.js 런타임: v20 (Azure Functions)

## 검증 방법

1. 새 프로젝트 생성 시 파이프라인 마지막 단계에서 DALL-E 3 커버 이미지 자동 생성 확인
2. 대시보드에서 커버 이미지/그라디언트 표시 확인
3. 종합강의안 탭에서 블로그 스타일 렌더링 확인
4. 인포그래픽 탭에서 카드 뷰 + 가로 스크롤 + HTML 다운로드 확인
5. 기존 프로젝트에서 'AI 수정 요청' → "커버 이미지 재생성해줘" 명령 테스트

## 수정 파일 목록

| 파일 | 작업 |
|------|------|
| `azure-functions/src/lib/image-generation.ts` | OpenAI lazy init, DALL-E 우선, 에러 로깅 |
| `azure-functions/src/functions/startGenerationJob.ts` | enableImageGeneration 기본값 true |
| `azure-functions/src/functions/generationJobWorker.ts` | markCompleted: true |
| `azure-functions/src/functions/generationChat.ts` | SQL 컬럼 수정, 커버 재생성 지원 |
| `azure-functions/src/functions/getProjects.ts` | 커버 이미지 쿼리 필터 |
| `src/pages/Dashboard.tsx` | 프로젝트 카드 UI 개선 |
| `src/components/studio/StyledDocumentViewer.tsx` | 신규: 블로그 스타일 문서 뷰어 |
| `src/components/studio/InfographicCardView.tsx` | 신규: 인포그래픽 카드 뷰 |
| `src/pages/GenerationStudioPage.tsx` | StyledDocumentViewer, InfographicCardView 적용 |
| `src/components/course/LessonDetailPane.tsx` | 렌더링 교체 + 슬라이드 정규화 |
| `.gitignore` | 빌드 아티팩트/배포 파일 추가 |
