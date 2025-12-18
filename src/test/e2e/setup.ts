/**
 * Selenium E2E 테스트 설정 파일
 * 
 * 출처:
 * - Selenium WebDriver: https://www.selenium.dev/documentation/
 * - WebDriver Manager: https://github.com/bonigarcia/webdrivermanager
 */

import { Builder, WebDriver, until, By, Capabilities } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import edge from 'selenium-webdriver/edge';
import firefox from 'selenium-webdriver/firefox';

// 테스트 환경 설정
export const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';
export const TIMEOUT = 10000; // 10초
export const IMPLICIT_WAIT = 5000; // 5초

/**
 * WebDriver 인스턴스 생성
 */
export async function createDriver(browser: 'chrome' | 'edge' | 'firefox' = 'edge'): Promise<WebDriver> {
  let driver: WebDriver;

  try {
    if (browser === 'chrome') {
      const options = new chrome.Options();

      // 헤드리스 모드 (CI 환경용)
      if (process.env.CI === 'true' || process.env.HEADLESS === 'true') {
        options.addArguments('--headless');
        options.addArguments('--no-sandbox');
        options.addArguments('--disable-dev-shm-usage');
      }

      // 기타 옵션
      options.addArguments('--disable-gpu');
      options.addArguments('--window-size=1920,1080');
      options.addArguments('--disable-blink-features=AutomationControlled');
      options.excludeSwitches('enable-automation');

      console.log('Creating Chrome WebDriver...');
      driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();
      console.log('Chrome WebDriver created successfully');
    } else if (browser === 'edge') {
      const options = new edge.Options();

      // 헤드리스 모드 (CI 환경용)
      if (process.env.CI === 'true' || process.env.HEADLESS === 'true') {
        options.addArguments('--headless');
        options.addArguments('--no-sandbox');
        options.addArguments('--disable-dev-shm-usage');
      }

      // 기타 옵션
      options.addArguments('--disable-gpu');
      options.addArguments('--window-size=1920,1080');
      options.addArguments('--disable-blink-features=AutomationControlled');
      options.excludeSwitches('enable-automation');

      console.log('Creating Edge WebDriver...');
      driver = await new Builder()
        .forBrowser('MicrosoftEdge')
        .setEdgeOptions(options)
        .build();
      console.log('Edge WebDriver created successfully');
    } else {
      const options = new firefox.Options();

      if (process.env.CI === 'true' || process.env.HEADLESS === 'true') {
        options.addArguments('--headless');
      }

      console.log('Creating Firefox WebDriver...');
      driver = await new Builder()
        .forBrowser('firefox')
        .setFirefoxOptions(options)
        .build();
      console.log('Firefox WebDriver created successfully');
    }

    // 암시적 대기 설정
    await driver.manage().setTimeouts({
      implicit: IMPLICIT_WAIT,
      pageLoad: TIMEOUT,
      script: TIMEOUT,
    });

    // 창 크기 설정
    await driver.manage().window().setRect({ width: 1920, height: 1080 });

    return driver;
  } catch (error) {
    console.error('Failed to create WebDriver:', error);
    throw new Error(
      'E2E 테스트를 실행하려면 다음이 필요합니다:\n' +
      '1. Edge 브라우저 (Windows에 기본 설치됨) 또는 Chrome 브라우저\n' +
      '2. EdgeDriver 설치 (npm install -g edgedriver) 또는 ChromeDriver\n' +
      '   - Edge: npm install -g edgedriver\n' +
      '   - Chrome: npm install -g chromedriver\n' +
      '3. 개발 서버 실행 (npm run dev)\n\n' +
      `원본 에러: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * 요소가 나타날 때까지 대기
 */
export async function waitForElement(
  driver: WebDriver,
  locator: By,
  timeout: number = TIMEOUT
): Promise<void> {
  await driver.wait(until.elementLocated(locator), timeout);
}

/**
 * 요소가 클릭 가능할 때까지 대기
 */
export async function waitForClickable(
  driver: WebDriver,
  locator: By,
  timeout: number = TIMEOUT
): Promise<void> {
  const element = await driver.wait(until.elementLocated(locator), timeout);
  await driver.wait(until.elementIsVisible(element), timeout);
  await driver.wait(until.elementIsEnabled(element), timeout);
}

/**
 * 페이지가 로드될 때까지 대기
 */
export async function waitForPageLoad(driver: WebDriver, timeout: number = TIMEOUT): Promise<void> {
  await driver.wait(
    async () => {
      const readyState = await driver.executeScript('return document.readyState');
      return readyState === 'complete';
    },
    timeout
  );
}

/**
 * 스크롤하여 요소가 보이도록 함
 */
export async function scrollToElement(driver: WebDriver, element: any): Promise<void> {
  await driver.executeScript('arguments[0].scrollIntoView({ behavior: "smooth", block: "center" });', element);
  await driver.sleep(500); // 스크롤 애니메이션 대기
}

/**
 * 스크린샷 저장
 */
export async function takeScreenshot(driver: WebDriver, filename: string): Promise<void> {
  try {
    const screenshot = await driver.takeScreenshot();
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const screenshotDir = path.join(process.cwd(), 'test-results', 'screenshots');
    await fs.mkdir(screenshotDir, { recursive: true });
    
    const filepath = path.join(screenshotDir, `${filename}.png`);
    await fs.writeFile(filepath, screenshot, 'base64');
    console.log(`Screenshot saved: ${filepath}`);
  } catch (error) {
    console.error('Failed to save screenshot:', error);
  }
}

/**
 * 테스트 헬퍼: 로그인
 */
export async function login(
  driver: WebDriver,
  email: string,
  password: string
): Promise<void> {
  await driver.get(`${BASE_URL}/auth`);
  await waitForPageLoad(driver);

  // 로그인 모드 확인 (회원가입 모드면 전환)
  const signUpButton = await driver.findElements(By.xpath("//button[contains(text(), '회원가입')]"));
  if (signUpButton.length > 0) {
    const toggleButton = await driver.findElement(By.xpath("//button[contains(text(), '로그인')]"));
    await toggleButton.click();
    await driver.sleep(500);
  }

  // 이메일 입력
  const emailInput = await driver.findElement(By.css('input[type="email"]'));
  await emailInput.clear();
  await emailInput.sendKeys(email);

  // 비밀번호 입력
  const passwordInput = await driver.findElement(By.css('input[type="password"]'));
  await passwordInput.clear();
  await passwordInput.sendKeys(password);

  // 로그인 버튼 클릭
  const submitButton = await driver.findElement(By.xpath("//button[contains(text(), '로그인')]"));
  await submitButton.click();

  // 로그인 완료 대기 (대시보드로 리다이렉트)
  await driver.wait(until.urlContains('/dashboard'), TIMEOUT * 2);
  await waitForPageLoad(driver);
}

/**
 * 테스트 헬퍼: 로그아웃
 */
export async function logout(driver: WebDriver): Promise<void> {
  try {
    const logoutButton = await driver.findElement(By.xpath("//button[contains(text(), '로그아웃')]"));
    await logoutButton.click();
    await driver.sleep(1000);
  } catch (error) {
    // 이미 로그아웃된 상태일 수 있음
    console.log('Logout button not found, may already be logged out');
  }
}

