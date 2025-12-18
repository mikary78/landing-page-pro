# 2025-12-17 - 관리자 페이지 추가

## 사용자 요구사항
1. 관리자 페이지를 생성해달라는 요청

## 구현 답변
- `/admin` 경로에 관리자 콘솔을 추가하여 요약 통계(사용자/프로젝트/코스), 최근 활동(프로젝트/코스), 역할 관리(역할 조회·변경·새로고침)를 제공
- `useUserRole` 훅으로 현재 사용자 역할을 안전하게 조회하고, admin 권한이 아닌 경우 접근 차단 안내를 노출
- 헤더에 admin 권한 사용자에게만 보이는 `/admin` 진입 버튼을 추가하여 탐색성을 확보
- Supabase RLS 정책을 전제로 클라이언트에서는 최소 정보만 조회하며, 토큰·비밀번호 등 민감 데이터는 처리하거나 노출하지 않음

## 수정 내역 요약
- **신규** `src/pages/Admin.tsx`: 관리자 콘솔 화면(통계, 최근 프로젝트/코스, 역할 관리), 로딩 상태 처리, 무권한 안내
- **신규** `src/hooks/useUserRole.ts`: 사용자 역할 조회/리프레시 훅, admin 여부 계산
- **UI** `src/components/Header.tsx`: admin 권한 보유 시 헤더에 관리자 버튼 노출
- **라우팅** `src/App.tsx`: `/admin` 라우트 등록
- **테스트** `src/pages/__tests__/AdminPage.test.tsx`: admin/비admin 렌더링 시나리오 단위 테스트

## 테스트 및 검증
- `npm run test:run -- AdminPage.test.tsx` (React Router v7 사전 경고만 표시, 기능 영향 없음)


