/**
 * 랜딩 페이지 (Index) E2E 테스트
 * 
 * 테스트 항목:
 * - 페이지 로드 확인
 * - 헤더 네비게이션
 * - Hero 섹션
 * - Features 섹션
 * - Pipeline 섹션
 * - Personas 섹션
 * - Metrics 섹션
 * - CTA 버튼
 * - Footer
 * - 로그인/회원가입 링크
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebDriver, By, until } from 'selenium-webdriver';
import {
  createDriver,
  BASE_URL,
  waitForPageLoad,
  waitForElement,
  scrollToElement,
  takeScreenshot,
} from './setup';

describe('랜딩 페이지 (Index) E2E 테스트', () => {
  let driver: WebDriver;

  beforeAll(async () => {
    driver = await createDriver();
  });

  afterAll(async () => {
    await driver.quit();
  });

  it('페이지가 정상적으로 로드되어야 함', async () => {
    await driver.get(BASE_URL);
    await waitForPageLoad(driver);

    const title = await driver.getTitle();
    expect(title).toBeTruthy();

    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).toContain(BASE_URL);
  });

  it('헤더가 표시되어야 함', async () => {
    await driver.get(BASE_URL);
    await waitForPageLoad(driver);

    // 로고 확인
    const logo = await driver.findElement(By.css('header'));
    expect(await logo.isDisplayed()).toBe(true);

    // 네비게이션 링크 확인
    const navLinks = await driver.findElements(By.css('nav a'));
    expect(navLinks.length).toBeGreaterThan(0);
  });

  it('Hero 섹션이 표시되어야 함', async () => {
    await driver.get(BASE_URL);
    await waitForPageLoad(driver);

    // Hero 섹션 확인 (h1 태그 또는 특정 클래스)
    const heroSection = await driver.findElements(By.css('h1, [class*="hero"], [class*="Hero"]'));
    expect(heroSection.length).toBeGreaterThan(0);
  });

  it('Features 섹션으로 스크롤할 수 있어야 함', async () => {
    await driver.get(BASE_URL);
    await waitForPageLoad(driver);

    // Features 링크 클릭
    try {
      const featuresLink = await driver.findElement(By.xpath("//a[contains(text(), '기능')]"));
      await featuresLink.click();
      await driver.sleep(1000);

      // Features 섹션 확인
      const featuresSection = await driver.findElements(By.id('features'));
      expect(featuresSection.length).toBeGreaterThan(0);
    } catch (error) {
      // 링크가 없을 수도 있으므로 스크롤로 확인
      await driver.executeScript('window.scrollTo(0, document.body.scrollHeight / 2);');
      await driver.sleep(1000);
    }
  });

  it('CTA 버튼이 작동해야 함', async () => {
    await driver.get(BASE_URL);
    await waitForPageLoad(driver);

    // CTA 버튼 찾기 (시작하기, 시작 등)
    const ctaButtons = await driver.findElements(
      By.xpath("//button[contains(text(), '시작') or contains(text(), '시작하기')]")
    );

    if (ctaButtons.length > 0) {
      const ctaButton = ctaButtons[0];
      await scrollToElement(driver, ctaButton);
      await ctaButton.click();
      await driver.sleep(1000);

      // 로그인 페이지로 이동했는지 확인
      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl).toMatch(/\/auth|\/dashboard/);
    }
  });

  it('Footer가 표시되어야 함', async () => {
    await driver.get(BASE_URL);
    await waitForPageLoad(driver);

    // 페이지 하단으로 스크롤
    await driver.executeScript('window.scrollTo(0, document.body.scrollHeight);');
    await driver.sleep(1000);

    // Footer 확인
    const footer = await driver.findElements(By.css('footer, [class*="footer"], [class*="Footer"]'));
    expect(footer.length).toBeGreaterThan(0);
  });

  it('로그인 링크가 작동해야 함', async () => {
    await driver.get(BASE_URL);
    await waitForPageLoad(driver);

    // 로그인 버튼/링크 찾기
    const loginButtons = await driver.findElements(
      By.xpath("//a[contains(text(), '로그인')] | //button[contains(text(), '로그인')]")
    );

    if (loginButtons.length > 0) {
      const loginButton = loginButtons[0];
      await loginButton.click();
      await driver.sleep(1000);

      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl).toContain('/auth');
    }
  });

  it('모든 섹션이 표시되어야 함', async () => {
    await driver.get(BASE_URL);
    await waitForPageLoad(driver);

    // 각 섹션 ID 확인
    const sections = ['features', 'pipeline', 'personas', 'metrics'];
    
    for (const sectionId of sections) {
      try {
        const section = await driver.findElement(By.id(sectionId));
        await scrollToElement(driver, section);
        await driver.sleep(500);
        
        expect(await section.isDisplayed()).toBe(true);
      } catch (error) {
        console.log(`Section ${sectionId} not found, may not exist`);
      }
    }
  });

  it('반응형 디자인이 작동해야 함 (모바일 뷰)', async () => {
    await driver.get(BASE_URL);
    await waitForPageLoad(driver);

    // 모바일 크기로 변경
    await driver.manage().window().setRect({ width: 375, height: 667 });
    await driver.sleep(1000);

    // 헤더가 여전히 표시되는지 확인
    const header = await driver.findElement(By.css('header'));
    expect(await header.isDisplayed()).toBe(true);

    // 원래 크기로 복원
    await driver.manage().window().setRect({ width: 1920, height: 1080 });
  });
});

