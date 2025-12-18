# E2E 테스트 가이드

이 디렉토리에는 Selenium WebDriver를 사용한 End-to-End (E2E) 테스트가 포함되어 있습니다.

## 요구사항

E2E 테스트를 실행하기 전에 다음을 설치해야 합니다:

### 1. 브라우저

#### Windows 사용자 (권장: Edge)
- **Microsoft Edge**: Windows에 기본 설치되어 있습니다
- Edge 버전 확인: `edge://version/`

#### 기타 브라우저
- **Chrome**: [Chrome 다운로드](https://www.google.com/chrome/)
- **Firefox**: [Firefox 다운로드](https://www.mozilla.org/firefox/)

### 2. WebDriver 설치

브라우저에 맞는 WebDriver를 설치하세요:

#### Windows + Edge (권장)
```bash
npm install -g edgedriver
```

#### Chrome 사용 시
```bash
npm install -g chromedriver
```

#### Firefox 사용 시
```bash
npm install -g geckodriver
```

#### 수동 다운로드 (대안)
- EdgeDriver: [Microsoft Edge Driver 다운로드](https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/)
- ChromeDriver: [ChromeDriver 다운로드](https://chromedriver.chromium.org/downloads)
- GeckoDriver: [GeckoDriver 다운로드](https://github.com/mozilla/geckodriver/releases)

### 3. 개발 서버 실행
E2E 테스트는 실행 중인 애플리케이션에 대해 수행됩니다:

```bash
# 터미널 1: 개발 서버 시작
npm run dev

# 터미널 2: E2E 테스트 실행
npm run test:e2e
```

## 테스트 실행

### 전체 E2E 테스트 실행 (기본: Edge)
```bash
npm run test:e2e
```

### 특정 브라우저로 테스트 실행
테스트 파일에서 `createDriver()` 호출 시 브라우저를 지정할 수 있습니다:

```typescript
// Edge (기본)
driver = await createDriver('edge');

// Chrome
driver = await createDriver('chrome');

// Firefox
driver = await createDriver('firefox');
```

### UI 모드로 E2E 테스트 실행
```bash
npm run test:e2e:ui
```

### 헤드리스 모드로 실행 (백그라운드)
```bash
# Windows (PowerShell)
$env:HEADLESS="true"; npm run test:e2e

# Windows (CMD)
set HEADLESS=true && npm run test:e2e

# Linux/Mac
HEADLESS=true npm run test:e2e
```

## 테스트 파일 구조

```
src/test/e2e/
├── README.md           # 이 파일
├── setup.ts            # 테스트 헬퍼 함수 및 설정
├── auth.test.ts        # 인증 관련 테스트
├── dashboard.test.ts   # 대시보드 테스트
├── index.test.ts       # 랜딩 페이지 테스트
├── project.test.ts     # 프로젝트 생성/상세 테스트
├── other-pages.test.ts # 기타 페이지 테스트
└── integration.test.ts # 통합 시나리오 테스트
```

## 문제 해결

### WebDriver 버전 불일치 에러
```
Error: SessionNotCreatedError: session not created: This version of EdgeDriver only supports Edge version XX
```

**해결책**: WebDriver 버전을 브라우저 버전과 일치시키세요.

```bash
# EdgeDriver 재설치
npm uninstall -g edgedriver
npm install -g edgedriver

# 또는 ChromeDriver 재설치
npm uninstall -g chromedriver
npm install -g chromedriver
```

### EdgeDriver를 찾을 수 없는 경우
```
Error: Cannot find msedgedriver
```

**해결책**:
1. EdgeDriver가 전역으로 설치되었는지 확인
   ```bash
   npm list -g edgedriver
   ```

2. PATH에 추가되었는지 확인
   ```bash
   # Windows에서 확인
   where msedgedriver
   ```

3. 재설치 시도
   ```bash
   npm install -g edgedriver --force
   ```

### Connection refused 에러
```
Error: connect ECONNREFUSED 127.0.0.1:5173
```

**해결책**: 개발 서버가 실행 중인지 확인하세요.

```bash
npm run dev
```

### Timeout 에러
테스트가 타임아웃되면 `vitest.e2e.config.ts`에서 타임아웃 값을 늘리세요:

```typescript
testTimeout: 120000, // 120초
hookTimeout: 120000,
```

## 단위 테스트만 실행

E2E 테스트 환경 설정이 복잡한 경우, 단위 테스트만 실행할 수 있습니다:

```bash
npm run test:run
```

## CI/CD 환경

GitHub Actions나 다른 CI 환경에서는 헤드리스 모드를 사용하세요:

```yaml
- name: Run E2E tests
  run: |
    npm run dev &
    sleep 5
    HEADLESS=true npm run test:e2e
  env:
    CI: true
```
