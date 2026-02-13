# 2026-02-13: 관리자 API 라우트 수정, 아이콘 기반 커버 전환, 대시보드 UI 통일, AI 수정 채팅 오류 수정

## 사용자 요구사항
1. 프로젝트 생성 시 이미지 생성(DALL-E 3) 단계에서 계속 에러 발생 → 해결 요청
2. 이미지 대신 프로젝트 내용에 맞는 아이콘으로 대체 요청
3. '내 코스' 대시보드 UI를 프로젝트 대시보드와 동일하게 적용
4. AI 수정 요청(Generation Chat) 기능 500 에러 수정

## 구현 답변
- DALL-E 이미지 생성을 완전히 제거하고, AI 기반 이모지+그라디언트 선택으로 전환
- 프로젝트/코스 대시보드 카드 UI를 아이콘+그라디언트 배너 스타일로 통일
- 관리자 API 라우트 Azure Functions 예약 경로 충돌 해결
- Generation Chat SQL 컬럼명 불일치 수정

## 수정 내역 요약

### 1. 관리자 API 라우트 수정 (Backend)

**문제**: `/api/admin/dashboard`, `/api/admin/change-role`이 Azure Functions에서 404 반환
**원인**: Azure Functions 플랫폼에서 `/admin/` 경로가 관리 API용으로 예약되어 있음

#### `azure-functions/src/functions/adminDashboard.ts`
- 라우트 변경: `admin/dashboard` → `manage/dashboard`

#### `azure-functions/src/functions/adminChangeRole.ts`
- 라우트 변경: `admin/change-role` → `manage/change-role`

#### `src/lib/azureFunctions.ts`
- API 엔드포인트 경로 업데이트: `/api/admin/*` → `/api/manage/*`

### 2. Azure Functions 배포 수정

**문제**: 배포 후 모든 함수가 404 반환
**원인**: `dist/` 폴더에 `npm ci --production` 미실행으로 `@azure/functions` 모듈 누락

**해결**: 배포 프로세스에 `cd dist && npm ci --production` 단계 추가
- 배포 후 43개 함수 정상 등록 확인

### 3. 커버 이미지 → 아이콘 기반 전환 (Backend)

**문제**: DALL-E 3 이미지 생성이 OPENAI_API_KEY 누락으로 지속 실패

#### `azure-functions/src/functions/generationJobWorker.ts`
- `design_assets` 스텝 전면 교체:
  - 기존: DALL-E 3 / Vertex AI Imagen으로 base64 이미지 생성
  - 변경: AI 텍스트 생성으로 이모지 아이콘 + 그라디언트 색상 2색 선택
- `import { generateImageDataUrl }` 제거
- 아티팩트 타입 유니온에 `'cover'` 추가
- 커버 데이터 구조: `{ icon: string, gradient: string[], createdAt: string }`

#### `azure-functions/src/functions/getProjects.ts`
- SQL 서브쿼리 변경:
  - 기존: `cover_image_url` (base64 dataUrl)
  - 변경: `cover_icon` (이모지 문자열) + `cover_gradient` (JSON 배열)
- `ga.assets->'cover'->>'icon'` 및 `ga.assets->'cover'->'gradient'` 참조

### 4. 프로젝트 대시보드 UI 변경 (Frontend)

#### `src/pages/Dashboard.tsx`
- Project 타입: `cover_image_url?: string` → `cover_icon?: string; cover_gradient?: string[]`
- 프로젝트 카드: `<img>` 태그 → 아이콘+그라디언트 배너 div
  - `style={{ background: linear-gradient(135deg, color1, color2) }}`
  - 이모지 아이콘 중앙 배치, hover 시 확대 효과
- "내 코스" 탭 카드도 동일한 아이콘+그라디언트 배너 스타일로 재설계

### 5. 코스 페이지 UI 통일 (Frontend)

#### `src/pages/CoursesPage.tsx`
- 프로젝트 대시보드 카드 스타일과 동일하게 전면 재작성
- `COURSE_GRADIENTS` (6색 그라디언트 배열) + `COURSE_ICONS` (6종 이모지 배열) 추가
- 카드 레이아웃: 그라디언트 배너(h-44) + 이모지 아이콘 + 상태 배지 + 제목 + 설명 + 태그 + 날짜/버튼 푸터

### 6. AI 수정 요청 채팅 오류 수정 (Backend)

**문제**: `POST /api/generation/chat` → 500 에러 `column "content" does not exist`
**원인**: SQL 쿼리에서 존재하지 않는 `content` 컬럼 참조 (실제: `content_text`, `content_json`)

#### `azure-functions/src/functions/generationChat.ts`
- SQL 쿼리 수정 (line 106):
  - 기존: `SELECT artifact_type, assets, content, status FROM generation_artifacts`
  - 변경: `SELECT artifact_type, assets, content_text, content_json, status FROM generation_artifacts`
- 아티팩트 컨텐츠 참조 로직 수정 (lines 118-121):
  - 기존: `artifact.content`
  - 변경: `artifact.content_text || (artifact.content_json ? JSON.stringify(artifact.content_json) : null)`
- 이 수정으로 3가지 intent (question, revise, cancel) 모두 정상 동작

## 배포

| 대상 | 상태 | 비고 |
|------|------|------|
| Azure Functions | 43개 함수 정상 배포 | `npm run build && cd dist && npm ci --production && func azure functionapp publish func-landing-page-pro` |
| Frontend (SWA) | 정상 배포 | `npm run build` → `C:\temp\swa-deploy\` 복사 → `swa deploy` |

**참고**: SWA CLI는 경로에 공백이 포함되면 배포가 중단되므로, `C:\temp\swa-deploy\`로 복사 후 배포

## 검증 방법

1. `/api/manage/dashboard` 정상 응답 확인 (기존 `/api/admin/` 404 해결)
2. 새 프로젝트 생성 시 `design_assets` 스텝에서 이모지+그라디언트 정상 생성 확인
3. 대시보드에서 프로젝트 카드 아이콘+그라디언트 배너 표시 확인
4. 코스 페이지에서 동일한 카드 스타일 표시 확인
5. 스튜디오 AI 수정 요청: 질문/수정/취소 intent 정상 동작 확인

## 수정 파일 목록

| 파일 | 작업 |
|------|------|
| `azure-functions/src/functions/adminDashboard.ts` | 라우트 `admin/` → `manage/` |
| `azure-functions/src/functions/adminChangeRole.ts` | 라우트 `admin/` → `manage/` |
| `src/lib/azureFunctions.ts` | API 경로 업데이트 |
| `azure-functions/src/functions/generationJobWorker.ts` | design_assets: DALL-E → 아이콘+그라디언트, 아티팩트 타입에 'cover' 추가 |
| `azure-functions/src/functions/getProjects.ts` | cover_image_url → cover_icon + cover_gradient |
| `src/pages/Dashboard.tsx` | 프로젝트 카드 아이콘+그라디언트 UI, 코스 탭 동일 스타일 적용 |
| `src/pages/CoursesPage.tsx` | 프로젝트 대시보드 카드 스타일로 전면 재작성 |
| `azure-functions/src/functions/generationChat.ts` | SQL 컬럼 `content` → `content_text, content_json` |
