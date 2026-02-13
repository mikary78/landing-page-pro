# E2E 테스트 실행 가이드 (완전판)

**문서 버전**: 1.0  
**작성일**: 2026-01-08  
**프로젝트**: AI AutoPilot Landing Page Pro  
**대상 독자**: 개발자, QA 엔지니어

---

## 목차

1. [개요](#1-개요)
2. [사전 준비](#2-사전-준비)
3. [환경 설정 (Windows)](#3-환경-설정-windows)
4. [환경 설정 (macOS/Linux)](#4-환경-설정-macoslinux)
5. [Selenium WebDriver 테스트 실행](#5-selenium-webdriver-테스트-실행)
6. [Playwright 테스트 실행](#6-playwright-테스트-실행)
7. [테스트 결과 분석](#7-테스트-결과-분석)
8. [문제 해결 가이드](#8-문제-해결-가이드)
9. [CI/CD 환경 설정](#9-cicd-환경-설정)
10. [테스트 작성 가이드](#10-테스트-작성-가이드)
11. [베스트 프랙티스](#11-베스트-프랙티스)
12. [FAQ](#12-faq)

---

## 1. 개요

### 1.1 E2E 테스트란?

End-to-End (E2E) 테스트는 실제 사용자 관점에서 애플리케이션의 전체 흐름을 검증하는 테스트입니다. 브라우저를 자동화하여 사용자의 행동을 시뮬레이션합니다.

### 1.2 테스트 도구 구성

이 프로젝트에서는 두 가지 E2E 테스트 도구를 사용합니다:

| 도구 | 용도 | 장점 |
|------|------|------|
| **Selenium WebDriver** | 전체 UI E2E 테스트 | 다양한 브라우저 지원, 안정성 |
| **Playwright** | Azure Functions 통합 테스트 | 빠른 실행, API 테스트 통합 |

### 1.3 테스트 파일 구조

```
landing-page-pro/
├── src/
│   └── test/
│       ├── e2e/                         # Selenium WebDriver 테스트
│       │   ├── setup.ts                 # WebDriver 설정 및 헬퍼
│       │   ├── index.test.ts            # 랜딩 페이지 테스트
│       │   ├── auth.test.ts             # 인증 테스트
│       │   ├── dashboard.test.ts        # 대시보드 테스트
│       │   ├── project.test.ts          # 프로젝트 테스트
│       │   ├── other-pages.test.ts      # 기타 페이지 테스트
│       │   └── integration.test.ts      # 통합 시나리오 테스트
│       └── playwright/                  # Playwright 테스트
│           ├── azure-functions.test.ts  # Azure Functions 테스트
│           └── README.md                # Playwright 가이드
├── playwright.config.ts                 # Playwright 설정
├── vitest.e2e.config.ts                 # Vitest E2E 설정
├── test-results/                        # 테스트 결과 출력
│   ├── screenshots/                     # 실패 시 스크린샷
│   └── results.json                     # JSON 결과
└── playwright-report/                   # Playwright HTML 리포트
```

---

## 2. 사전 준비

### 2.1 필수 요구사항 체크리스트

테스트 실행 전 다음 사항을 확인하세요:

- [ ] Node.js 18.x 이상 설치
- [ ] npm 또는 yarn 패키지 매니저
- [ ] 브라우저 설치 (Chrome, Edge, 또는 Firefox)
- [ ] 프로젝트 의존성 설치 완료
- [ ] 개발 서버 실행 가능 상태

### 2.2 Node.js 버전 확인

```bash
# Node.js 버전 확인
node --version
# 예상 출력: v18.x.x 이상

# npm 버전 확인
npm --version
```

### 2.3 프로젝트 의존성 설치

```bash
# 프로젝트 디렉토리로 이동
cd landing-page-pro

# 의존성 설치
npm install

# 설치 확인
npm list selenium-webdriver
npm list @playwright/test
```

---

## 3. 환경 설정 (Windows)

### 3.1 브라우저 설치

#### 옵션 1: Microsoft Edge (권장)

Windows 10/11에 기본 설치되어 있습니다.

**Edge 버전 확인:**
1. Edge 브라우저 열기
2. 주소창에 `edge://version/` 입력
3. 버전 번호 확인 (예: 120.0.2210.91)

#### 옵션 2: Google Chrome

1. [Chrome 다운로드](https://www.google.com/chrome/) 페이지 접속
2. Chrome 설치
3. `chrome://version/`에서 버전 확인

### 3.2 WebDriver 설치

#### Edge WebDriver (권장)

```powershell
# PowerShell에서 실행
npm install -g edgedriver

# 설치 확인
where msedgedriver
```

#### Chrome WebDriver

```powershell
# PowerShell에서 실행
npm install -g chromedriver

# 설치 확인
where chromedriver
```

### 3.3 Playwright 브라우저 설치

```powershell
# Chromium 브라우저 설치 (Playwright용)
npm run playwright:install

# 또는 직접 실행
npx playwright install chromium
```

### 3.4 환경 변수 설정

#### 방법 1: .env 파일 생성

프로젝트 루트에 `.env` 파일을 생성합니다:

```env
# .env 파일 내용

# E2E 테스트 기본 설정
E2E_BASE_URL=http://localhost:5173

# 테스트 계정 (실제 테스트 계정으로 변경)
E2E_TEST_EMAIL=test@example.com
E2E_TEST_PASSWORD=testpassword123

# 헤드리스 모드 (기본: false)
HEADLESS=false

# CI 환경 (기본: false)
CI=false

# Playwright 설정
PLAYWRIGHT_BASE_URL=http://localhost:5173
VITE_AZURE_FUNCTIONS_URL=https://func-landing-page-pro.azurewebsites.net
```

#### 방법 2: PowerShell에서 임시 설정

```powershell
# PowerShell 환경 변수 설정
$env:E2E_BASE_URL="http://localhost:5173"
$env:HEADLESS="false"

# 설정 확인
echo $env:E2E_BASE_URL
```

#### 방법 3: CMD에서 임시 설정

```cmd
:: CMD 환경 변수 설정
set E2E_BASE_URL=http://localhost:5173
set HEADLESS=false

:: 설정 확인
echo %E2E_BASE_URL%
```

### 3.5 개발 서버 실행

```powershell
# 터미널 1: 개발 서버 시작
npm run dev

# 출력 확인
# VITE v7.x.x  ready in xxx ms
# ➜  Local:   http://localhost:5173/
```

브라우저에서 `http://localhost:5173` 접속하여 페이지 로드 확인

---

## 4. 환경 설정 (macOS/Linux)

### 4.1 브라우저 설치

#### macOS

```bash
# Homebrew로 Chrome 설치
brew install --cask google-chrome

# 버전 확인
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --version
```

#### Ubuntu/Debian

```bash
# Chrome 설치
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
sudo apt-get install -f

# 버전 확인
google-chrome --version
```

### 4.2 WebDriver 설치

#### macOS

```bash
# ChromeDriver 설치
brew install chromedriver

# 권한 문제 해결 (필요시)
xattr -d com.apple.quarantine /usr/local/bin/chromedriver
```

#### Ubuntu/Debian

```bash
# ChromeDriver 설치
sudo apt-get update
sudo apt-get install chromium-chromedriver

# 또는 npm으로 설치
npm install -g chromedriver
```

### 4.3 환경 변수 설정

```bash
# .env 파일 생성 또는 수정
cat > .env << EOF
E2E_BASE_URL=http://localhost:5173
E2E_TEST_EMAIL=test@example.com
E2E_TEST_PASSWORD=testpassword123
HEADLESS=false
EOF

# 또는 터미널에서 직접 설정
export E2E_BASE_URL="http://localhost:5173"
export HEADLESS="false"
```

---

## 5. Selenium WebDriver 테스트 실행

### 5.1 빠른 시작

```bash
# 1. 터미널 1 - 개발 서버 실행
npm run dev

# 2. 터미널 2 - E2E 테스트 실행
npm run test:e2e
```

### 5.2 상세 실행 옵션

#### 전체 E2E 테스트 실행

```bash
npm run test:e2e
```

**예상 출력:**
```
✓ src/test/e2e/index.test.ts (9 tests) 15234ms
✓ src/test/e2e/auth.test.ts (10 tests) 12456ms
✓ src/test/e2e/dashboard.test.ts (6 tests) 18234ms
...

Test Files  6 passed (6)
Tests       45 passed (45)
Duration    1m 23s
```

#### 특정 테스트 파일만 실행

```bash
# 랜딩 페이지 테스트만
npm run test:e2e -- src/test/e2e/index.test.ts

# 인증 테스트만
npm run test:e2e -- src/test/e2e/auth.test.ts

# 대시보드 테스트만
npm run test:e2e -- src/test/e2e/dashboard.test.ts

# 프로젝트 테스트만
npm run test:e2e -- src/test/e2e/project.test.ts

# 통합 시나리오 테스트만
npm run test:e2e -- src/test/e2e/integration.test.ts
```

#### UI 모드로 실행 (대화형)

```bash
npm run test:e2e:ui
```

브라우저에서 Vitest UI가 열리며, 테스트를 선택적으로 실행할 수 있습니다.

#### 헤드리스 모드 실행 (브라우저 창 없이)

```bash
# Windows PowerShell
$env:HEADLESS="true"; npm run test:e2e

# Windows CMD
set HEADLESS=true && npm run test:e2e

# macOS/Linux
HEADLESS=true npm run test:e2e
```

#### 특정 브라우저로 실행

테스트 파일에서 브라우저를 지정할 수 있습니다:

```typescript
// Edge 사용 (기본)
driver = await createDriver('edge');

// Chrome 사용
driver = await createDriver('chrome');

// Firefox 사용
driver = await createDriver('firefox');
```

### 5.3 테스트 실행 예제 (단계별)

**시나리오: 랜딩 페이지 테스트 실행**

```bash
# Step 1: 터미널 1에서 개발 서버 시작
npm run dev

# Step 2: 서버 시작 확인 (약 5초 대기)
# 브라우저에서 http://localhost:5173 접속 확인

# Step 3: 새 터미널(터미널 2)에서 테스트 실행
npm run test:e2e -- src/test/e2e/index.test.ts

# Step 4: 결과 확인
# 성공 시: ✓ src/test/e2e/index.test.ts (9 tests) passed
# 실패 시: × src/test/e2e/index.test.ts (1 failed, 8 passed)
```

---

## 6. Playwright 테스트 실행

### 6.1 빠른 시작

```bash
# 1. Playwright 브라우저 설치 (최초 1회)
npm run playwright:install

# 2. 개발 서버 실행
npm run dev

# 3. Playwright 테스트 실행
npm run test:playwright
```

### 6.2 상세 실행 옵션

#### 기본 실행 (헤드리스)

```bash
npm run test:playwright
```

**예상 출력:**
```
Running 16 tests using 1 worker

  ✓  1 [chromium] › src/test/playwright/azure-functions.test.ts:28:3 › Azure Functions 통합 테스트 › 테스트 페이지가 정상적으로 로드되어야 함 (1.2s)
  ✓  2 [chromium] › src/test/playwright/azure-functions.test.ts:36:3 › Azure Functions 통합 테스트 › 연결 정보 카드가 표시되어야 함 (823ms)
  ...

  16 passed (16.2s)
```

#### 헤드 모드 실행 (브라우저 표시)

```bash
npm run test:playwright:headed
```

브라우저 창이 열리고 테스트 실행 과정을 볼 수 있습니다.

#### UI 모드 실행 (대화형)

```bash
npm run test:playwright:ui
```

Playwright Test UI가 열리며:
- 테스트 선택 실행
- 단계별 실행
- 스크린샷 확인
- DOM 검사

#### 디버그 모드 실행

```bash
npm run test:playwright:debug
```

Playwright Inspector가 열리며:
- 단계별 실행
- 선택자 탐색
- 코드 생성

#### 테스트 리포트 보기

```bash
npm run test:playwright:report
```

HTML 리포트가 브라우저에서 열립니다.

### 6.3 환경별 URL 설정

```bash
# 로컬 개발 환경
PLAYWRIGHT_BASE_URL=http://localhost:5173 npm run test:playwright

# 스테이징 환경
PLAYWRIGHT_BASE_URL=https://staging.example.com npm run test:playwright

# 프로덕션 환경 (주의: 실제 데이터에 영향 줄 수 있음)
PLAYWRIGHT_BASE_URL=https://production.example.com npm run test:playwright
```

---

## 7. 테스트 결과 분석

### 7.1 콘솔 출력 해석

#### 성공 예시

```
✓ src/test/e2e/index.test.ts (9 tests) 15234ms
  ✓ 랜딩 페이지 (Index) E2E 테스트 > 페이지가 정상적으로 로드되어야 함 1234ms
  ✓ 랜딩 페이지 (Index) E2E 테스트 > 헤더가 표시되어야 함 567ms
  ...
```

- `✓` : 테스트 통과
- `15234ms` : 전체 테스트 파일 실행 시간
- `1234ms` : 개별 테스트 실행 시간

#### 실패 예시

```
× src/test/e2e/auth.test.ts (1 failed, 9 passed)
  × 인증 페이지 E2E 테스트 > 로그인 폼 요소들이 표시되어야 함
    TimeoutError: Waiting for element to be located By(css selector, input[type="email"])
    Wait timed out after 10000ms
```

- `×` : 테스트 실패
- `TimeoutError` : 요소를 찾는 데 시간 초과
- `10000ms` : 대기 시간

### 7.2 스크린샷 확인

테스트 실패 시 스크린샷이 자동으로 저장됩니다:

```
test-results/
└── screenshots/
    ├── auth-login-failed.png
    ├── dashboard-load-failed.png
    └── ...
```

### 7.3 Playwright HTML 리포트

```bash
# 리포트 열기
npm run test:playwright:report
```

리포트에서 확인할 수 있는 정보:
- 테스트별 성공/실패 상태
- 실행 시간
- 실패 시 스크린샷
- 실패 시 비디오 (설정된 경우)
- 트레이스 뷰어

### 7.4 JSON 결과 분석

```bash
# 결과 파일 위치
cat test-results/results.json
```

JSON 구조:
```json
{
  "suites": [...],
  "tests": [
    {
      "title": "테스트 이름",
      "status": "passed",
      "duration": 1234
    }
  ],
  "stats": {
    "passed": 16,
    "failed": 0,
    "duration": 16200
  }
}
```

---

## 8. 문제 해결 가이드

### 8.1 자주 발생하는 오류

#### 오류 1: WebDriver를 찾을 수 없음

```
Error: Cannot find msedgedriver
```

**해결 방법:**

```bash
# EdgeDriver 재설치
npm uninstall -g edgedriver
npm install -g edgedriver

# 또는 ChromeDriver로 전환
npm install -g chromedriver
```

테스트 파일에서 브라우저 변경:
```typescript
driver = await createDriver('chrome');
```

#### 오류 2: WebDriver 버전 불일치

```
SessionNotCreatedError: session not created: This version of EdgeDriver only supports Edge version 120
```

**해결 방법:**

1. 브라우저 버전 확인
   - Edge: `edge://version/`
   - Chrome: `chrome://version/`

2. WebDriver 업데이트
   ```bash
   npm uninstall -g edgedriver
   npm install -g edgedriver
   ```

3. 또는 특정 버전 설치
   ```bash
   npm install -g chromedriver@120
   ```

#### 오류 3: 연결 거부 (Connection Refused)

```
Error: connect ECONNREFUSED 127.0.0.1:5173
```

**해결 방법:**

```bash
# 개발 서버 실행 확인
npm run dev

# 다른 터미널에서 연결 테스트
curl http://localhost:5173
```

#### 오류 4: 요소를 찾을 수 없음 (Timeout)

```
TimeoutError: Waiting for element to be located By(css selector, #submit-button)
Wait timed out after 10000ms
```

**해결 방법:**

1. 선택자 확인
   - 브라우저 개발자 도구에서 요소 존재 확인
   - CSS 선택자 또는 XPath 수정

2. 대기 시간 증가
   ```typescript
   // setup.ts에서 TIMEOUT 값 증가
   export const TIMEOUT = 30000; // 30초
   ```

3. 명시적 대기 추가
   ```typescript
   await driver.sleep(2000); // 2초 대기
   await waitForPageLoad(driver);
   ```

#### 오류 5: 헤드리스 모드에서만 실패

```
Error: Element is not clickable at point (x, y)
```

**해결 방법:**

1. 창 크기 명시적 설정
   ```typescript
   await driver.manage().window().setRect({ width: 1920, height: 1080 });
   ```

2. 스크롤 후 클릭
   ```typescript
   await scrollToElement(driver, element);
   await element.click();
   ```

### 8.2 디버깅 팁

#### Selenium 디버깅

```typescript
// 스크린샷 저장
await takeScreenshot(driver, 'debug-step-1');

// 현재 URL 확인
console.log('Current URL:', await driver.getCurrentUrl());

// 페이지 소스 출력
console.log('Page source:', await driver.getPageSource());

// 특정 요소 텍스트 확인
const element = await driver.findElement(By.css('h1'));
console.log('Element text:', await element.getText());
```

#### Playwright 디버깅

```typescript
// 디버그 모드로 실행
await page.pause(); // Inspector 열기

// 스크린샷 저장
await page.screenshot({ path: 'debug-screenshot.png' });

// 콘솔 로그 캡처
page.on('console', msg => console.log('Browser log:', msg.text()));
```

### 8.3 환경별 문제 해결

#### Windows 특정 문제

1. **PowerShell 스크립트 실행 정책**
   ```powershell
   # 현재 정책 확인
   Get-ExecutionPolicy
   
   # 정책 변경 (필요시)
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **방화벽 문제**
   - Windows Defender 방화벽에서 Node.js 허용
   - 포트 5173 접근 허용

#### macOS 특정 문제

1. **ChromeDriver 권한 문제**
   ```bash
   # quarantine 속성 제거
   xattr -d com.apple.quarantine /usr/local/bin/chromedriver
   ```

2. **Gatekeeper 경고**
   - 시스템 환경설정 → 보안 및 개인 정보 보호 → "확인 없이 열기" 선택

---

## 9. CI/CD 환경 설정

### 9.1 GitHub Actions 설정

`.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  e2e-selenium:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Chrome
        run: |
          wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
          sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
          sudo apt-get update
          sudo apt-get install google-chrome-stable
      
      - name: Start dev server
        run: |
          npm run dev &
          sleep 10
      
      - name: Run E2E tests
        run: HEADLESS=true npm run test:e2e
        env:
          CI: true
      
      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-screenshots
          path: test-results/screenshots/

  e2e-playwright:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install chromium
      
      - name: Start dev server
        run: |
          npm run dev &
          sleep 10
      
      - name: Run Playwright tests
        run: npm run test:playwright
        env:
          CI: true
      
      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

### 9.2 Docker 환경

`Dockerfile.e2e`:

```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV CI=true
ENV HEADLESS=true

CMD ["npm", "run", "test:e2e"]
```

실행:
```bash
docker build -f Dockerfile.e2e -t e2e-tests .
docker run --rm e2e-tests
```

---

## 10. 테스트 작성 가이드

### 10.1 Selenium 테스트 작성

#### 기본 템플릿

```typescript
/**
 * [페이지명] E2E 테스트
 * 
 * 테스트 항목:
 * - [테스트 항목 1]
 * - [테스트 항목 2]
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebDriver, By, until } from 'selenium-webdriver';
import {
  createDriver,
  BASE_URL,
  waitForPageLoad,
  waitForElement,
  takeScreenshot,
} from './setup';

describe('[페이지명] E2E 테스트', () => {
  let driver: WebDriver;

  beforeAll(async () => {
    driver = await createDriver();
  });

  afterAll(async () => {
    await driver.quit();
  });

  it('페이지가 정상적으로 로드되어야 함', async () => {
    await driver.get(`${BASE_URL}/페이지경로`);
    await waitForPageLoad(driver);

    const title = await driver.findElement(By.css('h1'));
    expect(await title.getText()).toContain('예상 텍스트');
  });

  it('버튼 클릭이 작동해야 함', async () => {
    await driver.get(`${BASE_URL}/페이지경로`);
    await waitForPageLoad(driver);

    const button = await driver.findElement(By.css('button'));
    await button.click();
    await driver.sleep(1000);

    // 결과 확인
    const result = await driver.findElement(By.css('.result'));
    expect(await result.isDisplayed()).toBe(true);
  });
});
```

#### 선택자 작성 가이드

```typescript
// 1. CSS 선택자 (권장)
await driver.findElement(By.css('#login-button'));
await driver.findElement(By.css('.form-input'));
await driver.findElement(By.css('input[type="email"]'));

// 2. XPath (복잡한 선택에 유용)
await driver.findElement(By.xpath("//button[contains(text(), '로그인')]"));
await driver.findElement(By.xpath("//div[@class='card']//h2"));

// 3. ID (가장 안정적)
await driver.findElement(By.id('submit-button'));

// 4. 링크 텍스트
await driver.findElement(By.linkText('자세히 보기'));
await driver.findElement(By.partialLinkText('자세히'));
```

### 10.2 Playwright 테스트 작성

#### 기본 템플릿

```typescript
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

test.describe('[기능명] 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/페이지경로`);
    await page.waitForLoadState('networkidle');
  });

  test('페이지가 정상적으로 로드되어야 함', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('예상 텍스트');
  });

  test('버튼 클릭이 작동해야 함', async ({ page }) => {
    await page.click('button:has-text("클릭")');
    await expect(page.locator('.result')).toBeVisible();
  });
});

test.describe('API 테스트', () => {
  test('API 엔드포인트가 정상 작동해야 함', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/endpoint`);
    expect(response.ok()).toBeTruthy();
  });
});
```

---

## 11. 베스트 프랙티스

### 11.1 테스트 설계 원칙

1. **독립성**: 각 테스트는 독립적으로 실행 가능해야 함
2. **반복성**: 같은 조건에서 같은 결과 출력
3. **명확성**: 테스트 이름만으로 목적 파악 가능
4. **적정 범위**: 하나의 테스트는 하나의 기능만 검증

### 11.2 안정적인 테스트 작성

```typescript
// ❌ 나쁜 예: 고정 대기 시간
await driver.sleep(5000);
await button.click();

// ✅ 좋은 예: 조건부 대기
await waitForElement(driver, By.css('#button'));
await waitForClickable(driver, By.css('#button'));
await button.click();
```

```typescript
// ❌ 나쁜 예: 취약한 선택자
await driver.findElement(By.css('div:nth-child(3) > span'));

// ✅ 좋은 예: 안정적인 선택자
await driver.findElement(By.css('[data-testid="submit-button"]'));
await driver.findElement(By.id('submit-button'));
```

### 11.3 테스트 데이터 관리

```typescript
// 환경 변수 사용
const testEmail = process.env.E2E_TEST_EMAIL || 'test@example.com';
const testPassword = process.env.E2E_TEST_PASSWORD || 'testpassword123';

// 고유한 테스트 데이터 생성
const uniqueEmail = `test-${Date.now()}@example.com`;
const uniqueProjectName = `테스트 프로젝트 ${new Date().toISOString()}`;
```

### 11.4 에러 처리

```typescript
it('에러 상황 처리', async () => {
  try {
    await driver.get(`${BASE_URL}/page`);
    await waitForPageLoad(driver);
    
    const element = await driver.findElement(By.css('#element'));
    // 테스트 로직
  } catch (error) {
    // 실패 시 스크린샷 저장
    await takeScreenshot(driver, 'test-failure');
    throw error;
  }
});
```

---

## 12. FAQ

### Q1: 테스트가 로컬에서는 통과하지만 CI에서 실패합니다.

**A:** 일반적인 원인:
- 타이밍 이슈: CI 환경은 보통 느림
- 화면 크기 차이: 헤드리스 모드의 기본 크기
- 환경 변수 미설정

**해결:**
```typescript
// 타임아웃 증가
export const TIMEOUT = 30000;

// 화면 크기 명시
await driver.manage().window().setRect({ width: 1920, height: 1080 });
```

### Q2: 특정 브라우저에서만 테스트가 실패합니다.

**A:** 브라우저별 차이점 확인:
- CSS 렌더링 차이
- JavaScript 실행 타이밍
- 선택자 지원 차이

**해결:**
- 브라우저별 조건부 로직 추가
- 표준 CSS 선택자 사용
- 충분한 대기 시간 설정

### Q3: 테스트 실행 속도를 개선하려면?

**A:** 최적화 방법:
1. 병렬 실행 활성화
2. 불필요한 `sleep()` 제거
3. 선택적 테스트 실행
4. 테스트 데이터 재사용

### Q4: 인증이 필요한 테스트는 어떻게 하나요?

**A:** 두 가지 방법:
1. 테스트 시작 시 로그인 헬퍼 함수 사용
2. 인증 상태를 미리 설정 (쿠키/토큰)

```typescript
beforeAll(async () => {
  driver = await createDriver();
  await login(driver, testEmail, testPassword);
});
```

### Q5: 새로운 테스트 케이스를 추가하려면?

**A:** 단계:
1. 적절한 테스트 파일 선택 (또는 새로 생성)
2. `describe` 블록에 `it` 테스트 추가
3. 로컬에서 테스트 실행 확인
4. CI에서 통과 확인

---

## 부록: 명령어 요약

### Selenium WebDriver 테스트

| 명령어 | 설명 |
|--------|------|
| `npm run test:e2e` | 전체 E2E 테스트 실행 |
| `npm run test:e2e:ui` | UI 모드로 실행 |
| `npm run test:e2e -- [파일]` | 특정 파일만 실행 |
| `HEADLESS=true npm run test:e2e` | 헤드리스 모드 실행 |

### Playwright 테스트

| 명령어 | 설명 |
|--------|------|
| `npm run test:playwright` | 전체 Playwright 테스트 실행 |
| `npm run test:playwright:ui` | UI 모드로 실행 |
| `npm run test:playwright:headed` | 브라우저 표시하며 실행 |
| `npm run test:playwright:debug` | 디버그 모드 실행 |
| `npm run test:playwright:report` | 테스트 리포트 보기 |
| `npm run playwright:install` | Playwright 브라우저 설치 |

### 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `E2E_BASE_URL` | 테스트 대상 URL | `http://localhost:5173` |
| `PLAYWRIGHT_BASE_URL` | Playwright 테스트 URL | `http://localhost:5173` |
| `HEADLESS` | 헤드리스 모드 | `false` |
| `CI` | CI 환경 여부 | `false` |
| `E2E_TEST_EMAIL` | 테스트 이메일 | - |
| `E2E_TEST_PASSWORD` | 테스트 비밀번호 | - |

---

**문서 끝**
