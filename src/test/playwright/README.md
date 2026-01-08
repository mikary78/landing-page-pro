# Playwright E2E 테스트

Azure Functions 통합 테스트를 위한 Playwright E2E 테스트입니다.

## 테스트 실행

### 기본 실행
```bash
npm run test:playwright
```

### UI 모드로 실행 (대화형)
```bash
npm run test:playwright:ui
```

### 헤드 모드로 실행 (브라우저 표시)
```bash
npm run test:playwright:headed
```

### 디버그 모드로 실행
```bash
npm run test:playwright:debug
```

### 테스트 리포트 보기
```bash
npm run test:playwright:report
```

## 환경 변수

테스트 실행 전에 다음 환경 변수를 설정할 수 있습니다:

- `PLAYWRIGHT_BASE_URL`: 프론트엔드 기본 URL (기본값: `http://localhost:5173`)
- `VITE_AZURE_FUNCTIONS_URL`: Azure Functions URL (기본값: `https://func-landing-page-pro.azurewebsites.net`)

예시:
```bash
PLAYWRIGHT_BASE_URL=http://localhost:5173 npm run test:playwright
```

## 테스트 항목

### Azure Functions 통합 테스트
- 테스트 페이지 로드 확인
- 연결 정보 표시 확인
- 인증 상태 확인
- 테스트 케이스 표시 확인
- 인증 없이 테스트 실행 (hello GET/POST 성공, 401 응답 확인)
- 인증 포함 테스트 상태 확인
- 테스트 가이드 표시 확인
- Microsoft 로그인 버튼 확인
- 테스트 실행 중 로딩 상태 확인
- 응답 시간 표시 확인

### Azure Functions API 직접 테스트
- hello GET 엔드포인트 테스트
- hello POST 엔드포인트 테스트
- processDocument 엔드포인트 401 응답 확인
- generateCurriculum 엔드포인트 401 응답 확인

## 참고사항

- 인증 포함 테스트는 Microsoft Entra ID 설정이 완료되어야 실행 가능합니다.
- 테스트 실행 전에 개발 서버가 실행 중이어야 합니다 (`npm run dev`).
- Azure Functions가 배포되어 있어야 합니다.

## 브라우저 설치

처음 실행 시 브라우저를 설치해야 합니다:

```bash
npm run playwright:install
```

또는

```bash
npx playwright install chromium
```

