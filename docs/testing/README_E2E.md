# E2E 테스트 가이드

Selenium WebDriver를 사용한 End-to-End 테스트 가이드입니다.

## 설치

```bash
npm install
```

Selenium WebDriver와 ChromeDriver는 자동으로 설치됩니다.

## 환경 설정

### 환경 변수

`.env` 파일에 다음 변수를 설정할 수 있습니다:

```env
# E2E 테스트 기본 URL (기본값: http://localhost:5173)
E2E_BASE_URL=http://localhost:5173

# 테스트 계정 정보
E2E_TEST_EMAIL=test@example.com
E2E_TEST_PASSWORD=testpassword123

# 헤드리스 모드 실행 (CI 환경)
HEADLESS=true
CI=true
```

## 테스트 실행

### 모든 E2E 테스트 실행

```bash
npm run test:e2e
```

### 특정 테스트 파일 실행

```bash
npm run test:e2e -- src/test/e2e/index.test.ts
npm run test:e2e -- src/test/e2e/auth.test.ts
npm run test:e2e -- src/test/e2e/dashboard.test.ts
```

### UI 모드로 실행 (대화형)

```bash
npm run test:e2e:ui
```

## 테스트 구조

### 테스트 파일

- `src/test/e2e/setup.ts`: WebDriver 설정 및 헬퍼 함수
- `src/test/e2e/index.test.ts`: 랜딩 페이지 테스트
- `src/test/e2e/auth.test.ts`: 인증 페이지 테스트
- `src/test/e2e/dashboard.test.ts`: 대시보드 페이지 테스트
- `src/test/e2e/project.test.ts`: 프로젝트 생성/상세 페이지 테스트
- `src/test/e2e/other-pages.test.ts`: 기타 페이지 테스트
- `src/test/e2e/integration.test.ts`: 통합 테스트 시나리오

### 테스트 커버리지

#### 랜딩 페이지 (Index)
- ✅ 페이지 로드 확인
- ✅ 헤더 네비게이션
- ✅ Hero 섹션
- ✅ Features, Pipeline, Personas, Metrics 섹션
- ✅ CTA 버튼
- ✅ Footer
- ✅ 반응형 디자인

#### 인증 페이지 (Auth)
- ✅ 로그인 폼
- ✅ 회원가입 폼
- ✅ 모드 전환
- ✅ 이메일/비밀번호 유효성 검사
- ✅ Google 로그인 버튼
- ✅ 비밀번호 재설정 링크

#### 대시보드 페이지
- ✅ 로그인 필요 확인
- ✅ 프로젝트 목록 표시
- ✅ 프로젝트 생성 버튼
- ✅ 프로젝트 카드 클릭
- ✅ 통계 정보
- ✅ 빈 상태 처리

#### 프로젝트 페이지
- ✅ 프로젝트 생성 페이지
- ✅ 템플릿 선택
- ✅ 브리프 작성
- ✅ 프로젝트 상세 페이지
- ✅ 단계별 콘텐츠
- ✅ 다운로드 기능
- ✅ AI 모델 선택

#### 기타 페이지
- ✅ NotFound (404) 페이지
- ✅ ResetPassword 페이지
- ✅ Demo 페이지
- ✅ CourseView 페이지
- ✅ CourseFeedbackPage 페이지

#### 통합 시나리오
- ✅ 신규 사용자 회원가입 플로우
- ✅ 프로젝트 생성 플로우
- ✅ 프로젝트 관리 플로우
- ✅ 네비게이션 플로우
- ✅ 로그아웃 플로우

## 브라우저 설정

기본적으로 Chrome 브라우저를 사용합니다. Firefox를 사용하려면 `setup.ts`의 `createDriver` 함수를 수정하세요.

### ChromeDriver

ChromeDriver는 자동으로 다운로드됩니다. 수동 설치가 필요한 경우:

```bash
# Windows
choco install chromedriver

# macOS
brew install chromedriver

# Linux
sudo apt-get install chromium-chromedriver
```

## 스크린샷

테스트 실패 시 스크린샷이 `test-results/screenshots/` 디렉토리에 자동으로 저장됩니다.

## 주의사항

1. **개발 서버 실행**: E2E 테스트를 실행하기 전에 개발 서버가 실행 중이어야 합니다:
   ```bash
   npm run dev
   ```

2. **테스트 계정**: 실제 테스트를 위해서는 유효한 테스트 계정이 필요합니다. 환경 변수에 설정하세요.

3. **타임아웃**: 네트워크가 느린 환경에서는 타임아웃을 조정해야 할 수 있습니다 (`setup.ts`의 `TIMEOUT` 상수).

4. **헤드리스 모드**: CI 환경에서는 `HEADLESS=true` 환경 변수를 설정하여 헤드리스 모드로 실행하세요.

## 문제 해결

### ChromeDriver 버전 불일치

Chrome 브라우저 버전과 ChromeDriver 버전이 일치하지 않으면 오류가 발생할 수 있습니다. 최신 버전의 ChromeDriver를 사용하세요.

### 요소를 찾을 수 없음

페이지가 완전히 로드되기 전에 요소를 찾으려고 하면 실패할 수 있습니다. `waitForPageLoad` 및 `waitForElement` 헬퍼 함수를 사용하세요.

### 타임아웃 오류

네트워크가 느리거나 서버 응답이 느린 경우 타임아웃을 늘리세요.

## 참고 자료

- [Selenium WebDriver 공식 문서](https://www.selenium.dev/documentation/)
- [Selenium WebDriver JavaScript 바인딩](https://www.selenium.dev/selenium/docs/api/javascript/index.html)
- [WebDriver API](https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/index.html)

