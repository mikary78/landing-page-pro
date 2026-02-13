# PROJECT SHOWCASE (PDF용)

+--------------------------------------------------------------------+
| AI 교육 콘텐츠 생성 플랫폼 (Autopilot)                              |
| "AI로 커리큘럼부터 슬라이드까지 자동 생성"                          |
+--------------------------------------------------------------------+

## COVER (PDF 표지)
+--------------------------------------------------------------------+
| TITLE      : AI Autopilot                                           |
| SUBTITLE   : 교육 콘텐츠 자동 생성 플랫폼                           |
| TAGLINE    : "커리큘럼 → 슬라이드 → 코스까지 자동화"                 |
| PERIOD     : 2024-11-20 ~ 2026-01-17                                |
| REPOSITORY : https://github.com/mikary78/landing-page-pro           |
+--------------------------------------------------------------------+

## TABLE OF CONTENTS
1. 한눈에 보기
2. 프로젝트 요약
3. 아키텍처 흐름
4. 핵심 기능 (상태 포함)
5. 프로젝트 대시보드 (ASCII)
6. 서비스 생태계 맵 (ASCII)
7. 카테고리 매트릭스 (ASCII)
8. 페이지 스냅샷
9. 기술 스택 하이라이트
10. 배포 정보
11. 리스크/향후 방안

## SUMMARY (1-2분 요약)
- AI 기반 교육 콘텐츠 자동화 플랫폼으로 6단계 파이프라인을 제공
- 프로젝트 → 코스 빌더 연동으로 교육 과정 운영까지 연결
- Azure Functions + PostgreSQL 기반으로 서버리스 운영 구조 확보
- 멀티 AI 모델 지원으로 품질 비교/보정 루프 제공

## 0. 한눈에 보기
+----------------------+----------------------+----------------------+
| 페이지 수            | Azure Functions 수   | DB 테이블 수         |
| 26 (src/pages)       | 41 (app.http 기준)   | 17 (migration.sql)   |
+----------------------+----------------------+----------------------+
+----------------------+----------------------+----------------------+
| AI 모델 수           | 프론트엔드           | 백엔드               |
| 3 (gemini/claude/gpt)| React + Vite + TS    | Azure Functions      |
+----------------------+----------------------+----------------------+

## 1. 프로젝트 요약
- 목적: 교육 콘텐츠 제작 시간을 AI로 자동화
- 핵심 가치: 6단계 파이프라인, 멀티 AI 비교, 코스 빌더 연동
- 개발 기간: 2024-11-20 ~ 2026-01-17 (history 기준)
- 저장소: https://github.com/mikary78/landing-page-pro

## 2. 아키텍처 흐름
+------------------+     +--------------------+     +------------------+
| 사용자(브라우저) | --> | Azure Static Web   | --> | Azure Functions  |
| React SPA        |     | Apps               |     | Node.js API      |
+------------------+     +--------------------+     +------------------+
                                                           |
                                                           v
                                                   +------------------+
                                                   | PostgreSQL       |
                                                   | (Azure DB)       |
                                                   +------------------+

## 3. 핵심 기능 (상태 포함)
+---------------------------------------------------------------+
| [완료] 커리큘럼 자동 생성                                     |
| - /api/generateCurriculum                                     |
| - 코스 기반 모듈/레슨 자동 생성                               |
+---------------------------------------------------------------+
+---------------------------------------------------------------+
| [완료] 생성 파이프라인 오케스트레이션                          |
| - /api/generation/start, /api/generation/job/{projectId}      |
| - 단계별 결과/아티팩트 추적                                   |
+---------------------------------------------------------------+
+---------------------------------------------------------------+
| [완료] 코스 빌더 & 레슨 단위 AI 콘텐츠 생성                    |
| - /api/course/generate-content                                |
| - /api/course/enhance-content                                 |
| - /api/course/regenerate-content                              |
+---------------------------------------------------------------+
+---------------------------------------------------------------+
| [완료] 프로젝트/코스 관리                                      |
| - /api/createproject, /api/getprojects, /api/updateproject     |
| - /api/createcourse, /api/getcourses, /api/getcourse/{id}      |
+---------------------------------------------------------------+
+---------------------------------------------------------------+
| [완료] 피드백/배포/버전 관리                                   |
| - /api/feedback, /api/deployment, /api/course/versions         |
+---------------------------------------------------------------+

## 3-1. 프로젝트 대시보드 (ASCII 스타일)
Template: metric_dashboard

+----------------------------------------------------------------------+
| PROJECT DASHBOARD                                                    |
| 숫자로 보는 Autopilot 현황                                           |
+----------------------------------------------------------------------+
| 메트릭            | 값                           | 근거               |
|------------------|------------------------------|--------------------|
| 페이지 수         | 26                           | src/pages           |
| Functions 수      | 41                           | app.http 등록       |
| DB 테이블 수      | 17                           | db/migration.sql    |
| AI 모델 수        | 3 (gemini/claude/chatgpt)    | lib/ai-services.ts  |
| 배포 환경         | 미기재                       | repo 내 정보 없음   |
| 오픈소스/저장소   | github.com/mikary78/landing-page-pro | DESIGN_DOCUMENT.md |
+----------------------------------------------------------------------+

## 3-2. 서비스 생태계 맵 (ASCII 스타일)
Template: service_ecosystem

+----------------------------------------------------------------------+
| 서비스 도메인 요약                                                   |
+----------------------------------------------------------------------+
| 프로젝트/생성                                                      |
| - createproject, getprojects, generation/start, generation/job      |
| - project stages, generation artifacts                              |
+----------------------------------------------------------------------+
| 코스/레슨                                                          |
| - createcourse, getcourse, getmoduleswithlessons, getlesson          |
| - course/generate-content, course/enhance-content, course/regenerate-content |
+----------------------------------------------------------------------+
| 버전/피드백/배포                                                    |
| - course/versions, feedback, deployment                             |
+----------------------------------------------------------------------+
| 운영/통계                                                          |
| - getstats, user/roles                                               |
+----------------------------------------------------------------------+

## 3-3. 카테고리 매트릭스 (ASCII 스타일)
Template: category_matrix

+----------------------------------------------------------------------+
| 카테고리 매트릭스                                                   |
+----------------------+----------------------+-----------------------+
| 생성 파이프라인      | 코스 빌더            | 운영/관리             |
+----------------------+----------------------+-----------------------+
| 6단계 콘텐츠 생성    | 모듈/레슨 관리        | 통계/권한/배포         |
| generation/*         | create*/update*      | getstats, user/roles  |
| processDocument      | course/*             | deployment, feedback  |
+----------------------+----------------------+-----------------------+

## 3-4. 페이지 스냅샷 섹션 (ASCII 스타일)
Template: snapshot_grid

+----------------------------------------------------------------------+
| 페이지 스냅샷 (경로만 지정)                                          |
+----------------------------------------------------------------------+
| Index             | docs/screenshots/pages/index.png                 |
| Dashboard         | docs/screenshots/pages/dashboard.png             |
| Project Detail    | docs/screenshots/pages/project-detail.png        |
| Generation Studio | docs/screenshots/pages/generation-studio.png     |
| Course Builder    | docs/screenshots/pages/course-builder.png        |
+----------------------------------------------------------------------+

## 4. 기술 스택 하이라이트
- Frontend: React 18.3.1, Vite 7.2.7, TypeScript 5.8.3, Tailwind 3.4.17
- Backend: Azure Functions (Node.js >=18)
- Auth: Microsoft Entra External ID (MSAL)
- DB: PostgreSQL (Azure)
- CI/CD: GitHub Actions

## 5. 배포 정보 (실제 값 반영 필요)
- Production URL: [입력 필요]
- Staging URL: [입력 필요]
- Azure Functions 기본 URL(테스트 기준): https://func-landing-page-pro.azurewebsites.net

## 6. 페이지 스냅샷 (경로만 지정)
- docs/screenshots/pages/index.png
- docs/screenshots/pages/dashboard.png
- docs/screenshots/pages/project-detail.png
- docs/screenshots/pages/generation-studio.png
- docs/screenshots/pages/course-builder.png
- docs/screenshots/pages/course-detail.png
- docs/screenshots/pages/course-create.png

## 7. 스크린샷 캡션 예시
- Index: 랜딩/제품 가치 제안
- Dashboard: 프로젝트/코스 요약 및 통계
- Project Detail: 단계별 콘텐츠 결과
- Generation Studio: 파이프라인 진행 및 아티팩트 미리보기
- Course Builder: 모듈/레슨 구성 및 콘텐츠 생성

## 8. 리스크/향후 방안
+---------------------------------------------------------------+
| 문서-구현 드리프트 (Supabase vs Azure Functions)              |
| -> 단일 기준 문서로 정리하고 미사용 문서/폴더는 아카이빙       |
+---------------------------------------------------------------+
+---------------------------------------------------------------+
| 다중 백엔드 흔적 (backend/, services/, supabase/)             |
| -> 사용 여부를 명시하고 정리 계획 수립                         |
+---------------------------------------------------------------+
+---------------------------------------------------------------+
| 엔드포인트 표기 일관성 (케이스 혼재)                           |
| -> route 명시로 일관화 및 프론트 호출 정규화                   |
+---------------------------------------------------------------+
+---------------------------------------------------------------+
| 운영 테스트/헬스체크 자동화 부족                               |
| -> /api/hello 기반 스모크 테스트 CI 포함                        |
+---------------------------------------------------------------+
