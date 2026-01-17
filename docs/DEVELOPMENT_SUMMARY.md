# 프로젝트 개발 산출물

## 1. 프로젝트 개요
- 프로젝트명: AI Autopilot - 교육 콘텐츠 자동 생성 플랫폼 (`DESIGN_DOCUMENT.md`)
- 목적: AI 기반으로 교육 콘텐츠를 자동 생성해 제작 시간을 단축 (`DESIGN_DOCUMENT.md`)
- 개발 기간: 2024-11-20 ~ 2026-01-17 (`history/` 파일명 기준)
- 개발자: Autopilot Team (`README.md`)

## 2. 기술 스택
| 구분 | 기술 | 버전/근거 |
|------|------|-----------|
| 프론트엔드 | React | 18.3.1 (`package.json`) |
| 프론트엔드 | Vite | 7.2.7 (`package.json`) |
| 프론트엔드 | TypeScript | 5.8.3 (`package.json`) |
| 프론트엔드 | Tailwind CSS | 3.4.17 (`package.json`) |
| 프론트엔드 | shadcn/ui | Radix UI 기반 컴포넌트 사용 (`@radix-ui/*`) |
| 프론트엔드 | React Router | 6.30.1 (`package.json`) |
| 데이터/상태 | React Query | 5.83.0 (`package.json`) |
| 인증 | Microsoft Entra External ID (MSAL) | `@azure/msal-browser` 4.27.0, `@azure/msal-react` 3.0.23 |
| 백엔드 | Azure Functions | `@azure/functions` 4.5.0 (`azure-functions/package.json`) |
| 백엔드 런타임 | Node.js | >=18.0.0 (`azure-functions/package.json`) |
| 데이터베이스 | PostgreSQL | `pg` 8.11.3 + `db/migration.sql` |
| 배포 | Azure Static Web Apps | `staticwebapp.config.json` |
| CI/CD | GitHub Actions | `.github/workflows/*.yml` |
| 관측/로깅 | Application Insights | `@microsoft/applicationinsights-web` 3.3.10 |
| 테스트 | Vitest | 4.0.12 |
| 테스트 | Playwright | 1.57.0 |
| 기타 | Supabase JS SDK | 2.84.0 (`Admin`, `ResetPassword`에서 사용) |

## 3. 시스템 아키텍처
[사용자] → [Azure Static Web Apps] → [Azure Functions] → [PostgreSQL]
(React SPA)          (Node.js API)          (Azure DB)

- 인증: MSAL 기반 Entra External ID (`src/pages/Auth.tsx`, `src/hooks/useAzureAuth.tsx`)
- 작업 큐: Azure Storage Queue (`@azure/storage-queue`, `startGenerationJob.ts`)
- 관측: Application Insights (`src/lib/applicationInsights.ts`)

## 4. 주요 기능
### 4.1 페이지별 기능 (src/pages 기준)
| 페이지 | 목적/주요 기능 | API 엔드포인트 | 상태 | 스크린샷 |
|---|---|---|---|---|
| `src/pages/Index.tsx` | 랜딩/마케팅 메인 | 없음 (/api 호출 없음) | 완료 | `docs/screenshots/pages/index.png` |
| `src/pages/AboutPage.tsx` | 소개 페이지 | 없음 | 완료 | `docs/screenshots/pages/about.png` |
| `src/pages/Admin.tsx` | 관리자 콘솔, 사용자/프로젝트/코스 요약, 역할 관리 | Supabase 클라이언트 (profiles/projects/courses/user_roles) | 완료 | `docs/screenshots/pages/admin.png` |
| `src/pages/Auth.tsx` | Entra External ID 로그인/회원가입 | 없음 (MSAL 팝업) | 완료 | `docs/screenshots/pages/auth.png` |
| `src/pages/AzureFunctionTest.tsx` | Azure Functions 테스트 도구 | `/api/hello`<br>`/api/processDocument`<br>`/api/generateCurriculum` | 완료 | `docs/screenshots/pages/azure-function-test.png` |
| `src/pages/BlogPage.tsx` | 블로그 목록 | 없음 | 완료 | `docs/screenshots/pages/blog.png` |
| `src/pages/BlogDetailPage.tsx` | 블로그 상세 | 없음 | 완료 | `docs/screenshots/pages/blog-detail.png` |
| `src/pages/CourseBuilderPage.tsx` | 코스 빌더, 커리큘럼 생성/편집 | `/api/getcourse/{id}`<br>`/api/generateCurriculum`<br>하위 컴포넌트: `/api/createmodule`, `/api/createlesson`, `/api/updatemodule/{id}`, `/api/updatelesson/{id}`, `/api/getmoduleswithlessons/{id}`, `/api/getlesson/{id}`, `/api/course/generate-content`, `/api/course/enhance-content`, `/api/course/regenerate-content`, `/api/course/versions/{lessonId}` | 완료 | `docs/screenshots/pages/course-builder.png` |
| `src/pages/CourseCreatePage.tsx` | 코스 생성 | `/api/createcourse` | 완료 | `docs/screenshots/pages/course-create.png` |
| `src/pages/CourseDetail.tsx` | 코스 상세, 모듈/레슨/프로젝트 연결 | `/api/getcourse/{id}`<br>`/api/getmoduleswithlessons/{id}`<br>`/api/getproject/{projectId}`<br>`/api/getprojectstages/{projectId}` | 완료 | `docs/screenshots/pages/course-detail.png` |
| `src/pages/CourseFeedbackPage.tsx` | 피드백 작성/조회 | `/api/feedback/{projectId}` (GET)<br>`/api/feedback` (POST) | 완료 | `docs/screenshots/pages/course-feedback.png` |
| `src/pages/CoursesPage.tsx` | 코스 목록/삭제 | `/api/getcourses`<br>`/api/deletecourse/{courseId}` | 완료 | `docs/screenshots/pages/courses.png` |
| `src/pages/CourseView.tsx` | 공개 코스 뷰 | `/api/course/public/{projectId}` | 완료 | `docs/screenshots/pages/course-view.png` |
| `src/pages/Dashboard.tsx` | 프로젝트/코스 목록, 삭제, 요약 통계 | `/api/getprojects`<br>`/api/getcourses`<br>`/api/deleteproject/{projectId}`<br>`/api/deletecourse/{courseId}`<br>하위 컴포넌트: `/api/getstats/{userId}` | 완료 | `docs/screenshots/pages/dashboard.png` |
| `src/pages/Demo.tsx` | 데모 UI | 없음 | 완료 | `docs/screenshots/pages/demo.png` |
| `src/pages/ExamplesPage.tsx` | 예시 프로젝트 갤러리 | 없음 | 완료 | `docs/screenshots/pages/examples.png` |
| `src/pages/FAQPage.tsx` | FAQ | 없음 | 완료 | `docs/screenshots/pages/faq.png` |
| `src/pages/GenerationStudioPage.tsx` | 생성 파이프라인/아티팩트 확인, 대화형 수정, 코스 전환 | `/api/getproject/{id}`<br>`/api/generation/start`<br>`/api/generation/job/{projectId}`<br>`/api/generation/chat`<br>`/api/generation/cancel`<br>`/api/project/convert-to-course`<br>`/api/getcourses` | 완료 | `docs/screenshots/pages/generation-studio.png` |
| `src/pages/GuidePage.tsx` | 사용자 가이드 | 없음 | 완료 | `docs/screenshots/pages/guide.png` |
| `src/pages/NotFound.tsx` | 404 페이지 | 없음 | 완료 | `docs/screenshots/pages/not-found.png` |
| `src/pages/PricingPage.tsx` | 요금 안내 | 없음 | 완료 | `docs/screenshots/pages/pricing.png` |
| `src/pages/PrivacyPage.tsx` | 개인정보 처리방침 | 없음 | 완료 | `docs/screenshots/pages/privacy.png` |
| `src/pages/ProjectCreate.tsx` | 프로젝트 생성 및 생성 작업 시작 | `/api/gettemplates`<br>`/api/createproject`<br>`/api/generation/start` | 완료 | `docs/screenshots/pages/project-create.png` |
| `src/pages/ProjectDetail.tsx` | 프로젝트 상세/단계 결과, 재생성/템플릿 저장 | `/api/getproject/{id}`<br>`/api/getprojectstages/{projectId}?aiModel=...`<br>`/api/updateprojectstage/{stageId}`<br>`/api/savetemplate`<br>`/api/updateproject/{projectId}` | 완료 | `docs/screenshots/pages/project-detail.png` |
| `src/pages/ResetPassword.tsx` | 비밀번호 재설정 | Supabase Auth (`supabase.auth.setSession`) | 완료 | `docs/screenshots/pages/reset-password.png` |
| `src/pages/TermsPage.tsx` | 이용약관 | 없음 | 완료 | `docs/screenshots/pages/terms.png` |

### 4.2 인증/로그인
- Entra External ID 기반 로그인/회원가입 (MSAL 팝업)
- 비밀번호 재설정: Supabase Auth 세션 갱신 로직 포함
- 상태: 완료
- 스크린샷: `docs/screenshots/features/auth-flow.png`

### 4.3 대시보드
- 프로젝트/코스 목록 조회, 삭제, 통계 카드
- 상태: 완료
- 관련 API: `/api/getprojects`, `/api/getcourses`, `/api/getstats/{userId}`
- 스크린샷: `docs/screenshots/features/dashboard.png`

### 4.4 프로젝트 관리
- 프로젝트 생성/수정/단계 조회/재생성/템플릿 저장
- 상태: 완료
- 관련 API: `/api/createproject`, `/api/getproject/{projectId}`, `/api/getprojectstages/{projectId}`, `/api/updateproject/{projectId}`, `/api/updateprojectstage/{stageId}`, `/api/savetemplate`
- 스크린샷: `docs/screenshots/features/project-management.png`

### 4.5 커리큘럼 생성
- 코스 생성 이후 커리큘럼 자동 생성 및 모듈/레슨 생성
- 상태: 완료
- 관련 API: `/api/generateCurriculum`, `/api/createmodule`, `/api/createlesson`
- 스크린샷: `docs/screenshots/features/curriculum.png`

### 4.6 AI 콘텐츠 생성
- 생성 잡 시작/상태/취소, 대화형 수정
- 레슨 단위 AI 생성/강화/재생성
- 상태: 완료
- 관련 API: `/api/generation/start`, `/api/generation/job/{projectId}`, `/api/generation/chat`, `/api/generation/cancel`, `/api/course/generate-content`, `/api/course/enhance-content`, `/api/course/regenerate-content`
- 스크린샷: `docs/screenshots/features/ai-generation.png`

### 4.7 코스/레슨 관리
- 코스 생성/상세/공개 보기, 모듈/레슨 CRUD
- 상태: 완료
- 관련 API: `/api/createcourse`, `/api/getcourses`, `/api/getcourse/{courseId}`, `/api/course/public/{projectId}`, `/api/createmodule`, `/api/createlesson`, `/api/updatemodule/{moduleId}`, `/api/updatelesson/{lessonId}`
- 스크린샷: `docs/screenshots/features/course-management.png`

### 4.8 버전/배포/피드백
- 콘텐츠 버전 조회/복원, 코스 배포 상태 조회/등록, 피드백 수집
- 상태: 완료
- 관련 API: `/api/course/versions/{lessonId}`, `/api/deployment`, `/api/deployment/{projectId}`, `/api/feedback`, `/api/feedback/{projectId}`
- 스크린샷: `docs/screenshots/features/versions-feedback.png`

## 5. API 엔드포인트
| 엔드포인트 | 메서드 | 설명 |
|---|---|---|
| `/api/migrate/add-ai-model` | GET, POST | DB 마이그레이션 보조 |
| `/api/runMigration` | GET, POST | 마이그레이션 실행 |
| `/api/hello` | GET, POST | 헬스 체크/테스트 |
| `/api/processDocument` | POST | 문서 기반 5단계 콘텐츠 생성 |
| `/api/generateCurriculum` | POST | 커리큘럼 자동 생성 |
| `/api/generation/start` | POST | 생성 잡 시작 |
| `/api/generation/job/{projectId}` | GET | 생성 잡 상태 조회 |
| `/api/generation/chat` | POST | 생성 결과 대화형 수정 |
| `/api/generation/cancel` | POST | 생성 잡 취소 |
| `/api/createproject` | POST | 프로젝트 생성 |
| `/api/getprojects` | GET | 프로젝트 목록 |
| `/api/getproject/{projectId}` | GET | 프로젝트 상세 |
| `/api/updateproject/{projectId}` | PUT, PATCH | 프로젝트 수정 |
| `/api/deleteproject/{projectId}` | DELETE | 프로젝트 삭제 |
| `/api/getprojectstages/{projectId}` | GET | 프로젝트 단계 조회 |
| `/api/updateprojectstage/{stageId}` | PUT, PATCH | 프로젝트 단계 업데이트 |
| `/api/gettemplates` | GET | 프로젝트 템플릿 목록 |
| `/api/savetemplate` | POST | 프로젝트 템플릿 저장 |
| `/api/createcourse` | POST | 코스 생성 |
| `/api/getcourses` | GET | 코스 목록 |
| `/api/getcourse/{courseId}` | GET | 코스 상세 |
| `/api/course/public/{projectId}` | GET | 공개 코스 조회 |
| `/api/deletecourse/{courseId}` | DELETE | 코스 삭제 |
| `/api/createmodule` | POST | 모듈 생성 |
| `/api/createlesson` | POST | 레슨 생성 |
| `/api/createlessonproject` | POST | 레슨-프로젝트 연결 |
| `/api/updatemodule/{moduleId}` | PUT, PATCH | 모듈 수정 |
| `/api/updatelesson/{lessonId}` | PUT, PATCH | 레슨 수정 |
| `/api/getmoduleswithlessons/{courseId}` | GET | 모듈+레슨 목록 |
| `/api/getlesson/{lessonId}` | GET | 레슨 상세 |
| `/api/project/convert-to-course` | POST | 프로젝트→코스 변환 |
| `/api/course/generate-content` | POST | 레슨 콘텐츠 생성 |
| `/api/course/enhance-content` | POST | 레슨 콘텐츠 보강 |
| `/api/course/regenerate-content` | POST | 레슨 콘텐츠 재생성 |
| `/api/course/versions/{lessonId?}` | GET, POST, PUT | 콘텐츠 버전 관리 |
| `/api/deployment/{projectId}` | GET | 배포 상태 조회 |
| `/api/deployment` | POST | 배포 요청 |
| `/api/feedback/{projectId}` | GET | 피드백 조회 |
| `/api/feedback` | POST | 피드백 등록 |
| `/api/getstats/{userId}` | GET | 통계 조회 |
| `/api/user/roles` | GET | 사용자 역할 조회 |

## 6. 배포 환경
- Production URL: 미기재 (repo 내 명시 없음)
- Staging URL: 미기재 (repo 내 명시 없음)
- GitHub Repository: https://github.com/mikary78/landing-page-pro (`DESIGN_DOCUMENT.md`)
- 기본 Azure Functions URL(테스트 기본값): https://func-landing-page-pro.azurewebsites.net (`src/lib/__tests__/azureFunctionsUrl.test.ts`)
- Static Web Apps 설정: `/api/*`는 authenticated 요구 (`staticwebapp.config.json`)

## 7. 폴더 구조
```
landing-page-pro/
├── azure-functions/        # Azure Functions 백엔드
├── backend/                # FastAPI 기반 백엔드 스캐폴드
├── services/               # 마이크로서비스 분리 실험 구조
├── src/                    # React SPA
├── supabase/               # Supabase Edge Functions 프로토타입
├── db/                     # PostgreSQL 마이그레이션 스크립트
├── docs/                   # 문서
├── history/                # 변경 이력
└── infrastructure/         # 인프라 관련 리소스
```

## 8. 리스크 및 향후 방안
- 문서/구현 드리프트: Supabase 기반 설계 문서와 Azure Functions 구현이 혼재
  - 향후 방안: `README.md`, `DESIGN_DOCUMENT.md`에 “현재 표준 스택” 명시 후 비표준 문서 분리/아카이빙
- 다중 백엔드 흔적: `backend/`, `services/`, `supabase/` 폴더가 공존
  - 향후 방안: 사용 여부를 표기하고, 미사용 시 `archived/`로 이동 또는 제거
- 엔드포인트 표기 일관성: `generateCurriculum`, `processDocument`의 케이스가 화면/테스트 코드에서 혼재
  - 향후 방안: 프론트/백엔드 URL 규칙 통일, `route` 명시로 강제 정규화
- 환경변수 문서 분산: `.env.example`는 Supabase 중심, 실제 API는 Azure Functions 기준
  - 향후 방안: `docs/environment-variables-setup.md`에 단일 소스 문서화 및 샘플 통합
- 품질/운영 리스크: E2E/통합 테스트가 존재하나 실행 경로와 배포 파이프라인 검증은 별도
  - 향후 방안: `/api/hello` 기반 스모크 테스트를 CI에 포함하고 배포 후 헬스체크 자동화
