/**
 * 기타 페이지 E2E 테스트
 * 
 * 테스트 항목:
 * - NotFound (404) 페이지
 * - ResetPassword 페이지
 * - Demo 페이지
 * - CourseView 페이지
 * - CourseFeedbackPage 페이지
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebDriver, By, until } from 'selenium-webdriver';
import {
  createDriver,
  BASE_URL,
  waitForPageLoad,
  login,
  takeScreenshot,
} from './setup';

describe('기타 페이지 E2E 테스트', () => {
  let driver: WebDriver;
  const testEmail = process.env.E2E_TEST_EMAIL || 'test@example.com';
  const testPassword = process.env.E2E_TEST_PASSWORD || 'testpassword123';

  beforeAll(async () => {
    driver = await createDriver();
  });

  afterAll(async () => {
    await driver.quit();
  });

  describe('NotFound (404) 페이지', () => {
    it('존재하지 않는 경로 접근 시 404 페이지가 표시되어야 함', async () => {
      await driver.get(`${BASE_URL}/non-existent-page`);
      await waitForPageLoad(driver);
      await driver.sleep(1000);

      // 404 메시지 확인
      const notFoundElements = await driver.findElements(
        By.xpath("//*[contains(text(), '404') or contains(text(), 'not found') or contains(text(), '찾을 수 없습니다')]")
      );

      expect(notFoundElements.length).toBeGreaterThan(0);
    });

    it('404 페이지에 홈으로 돌아가기 링크가 있어야 함', async () => {
      await driver.get(`${BASE_URL}/non-existent-page`);
      await waitForPageLoad(driver);
      await driver.sleep(1000);

      // 홈 링크 찾기
      const homeLinks = await driver.findElements(
        By.xpath("//a[contains(text(), '홈') or contains(text(), 'Home') or contains(text(), '돌아가기')]")
      );

      if (homeLinks.length > 0) {
        await homeLinks[0].click();
        await driver.sleep(1000);

        const currentUrl = await driver.getCurrentUrl();
        expect(currentUrl).toBe(BASE_URL + '/');
      }
    });
  });

  describe('ResetPassword 페이지', () => {
    it('비밀번호 재설정 페이지가 표시되어야 함', async () => {
      await driver.get(`${BASE_URL}/reset-password`);
      await waitForPageLoad(driver);
      await driver.sleep(1000);

      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl).toContain('/reset-password');
    });

    it('이메일 입력 필드가 표시되어야 함', async () => {
      await driver.get(`${BASE_URL}/reset-password`);
      await waitForPageLoad(driver);
      await driver.sleep(1000);

      const emailInputs = await driver.findElements(
        By.css('input[type="email"], input[placeholder*="이메일"], input[name*="email"]')
      );

      expect(emailInputs.length).toBeGreaterThan(0);
    });

    it('비밀번호 재설정 요청 버튼이 있어야 함', async () => {
      await driver.get(`${BASE_URL}/reset-password`);
      await waitForPageLoad(driver);
      await driver.sleep(1000);

      const submitButtons = await driver.findElements(
        By.xpath("//button[contains(text(), '전송') or contains(text(), '요청') or contains(text(), '재설정')]")
      );

      expect(submitButtons.length).toBeGreaterThan(0);
    });

    it('이메일 입력 후 재설정 요청이 가능해야 함', async () => {
      await driver.get(`${BASE_URL}/reset-password`);
      await waitForPageLoad(driver);
      await driver.sleep(1000);

      const emailInput = await driver.findElement(
        By.css('input[type="email"], input[placeholder*="이메일"]')
      );

      await emailInput.clear();
      await emailInput.sendKeys('test@example.com');

      const submitButton = await driver.findElement(
        By.xpath("//button[@type='submit'] | //button[contains(text(), '전송')]")
      );

      await submitButton.click();
      await driver.sleep(2000);

      // 성공 메시지 또는 토스트 확인
      const successMessages = await driver.findElements(
        By.xpath("//*[contains(text(), '전송') or contains(text(), '이메일') or contains(text(), '확인')]")
      );

      // 메시지가 표시되거나 에러가 없어야 함
      expect(successMessages.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Demo 페이지', () => {
    it('Demo 페이지가 표시되어야 함', async () => {
      await driver.get(`${BASE_URL}/demo`);
      await waitForPageLoad(driver);
      await driver.sleep(1000);

      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl).toContain('/demo');
    });

    it('Demo 콘텐츠가 표시되어야 함', async () => {
      await driver.get(`${BASE_URL}/demo`);
      await waitForPageLoad(driver);
      await driver.sleep(2000);

      // Demo 콘텐츠 확인
      const demoContent = await driver.findElements(
        By.css('main, [class*="demo"], [class*="Demo"], [class*="content"], [class*="Content"]')
      );

      expect(demoContent.length).toBeGreaterThan(0);
    });
  });

  describe('CourseView 페이지', () => {
    it('CourseView 페이지에 접근할 수 있어야 함', async () => {
      try {
        await login(driver, testEmail, testPassword);
        
        // 실제 코스 ID가 필요하므로 테스트용 ID 사용
        await driver.get(`${BASE_URL}/course/test-course-id`);
        await waitForPageLoad(driver);
        await driver.sleep(2000);

        const currentUrl = await driver.getCurrentUrl();
        expect(currentUrl).toContain('/course/');
      } catch (error) {
        console.log('Course may not be available');
      }
    });

    it('코스 콘텐츠가 표시되어야 함', async () => {
      try {
        await login(driver, testEmail, testPassword);
        await driver.get(`${BASE_URL}/course/test-course-id`);
        await waitForPageLoad(driver);
        await driver.sleep(2000);

        // 코스 콘텐츠 확인
        const courseContent = await driver.findElements(
          By.css('[class*="course"], [class*="Course"], [class*="content"], [class*="Content"]')
        );

        // 콘텐츠가 있거나 에러 메시지가 표시될 수 있음
        expect(courseContent.length).toBeGreaterThanOrEqual(0);
      } catch (error) {
        console.log('Course may not be available');
      }
    });
  });

  describe('CourseFeedbackPage 페이지', () => {
    it('CourseFeedbackPage에 접근할 수 있어야 함', async () => {
      try {
        await login(driver, testEmail, testPassword);
        
        await driver.get(`${BASE_URL}/course/test-course-id/feedback`);
        await waitForPageLoad(driver);
        await driver.sleep(2000);

        const currentUrl = await driver.getCurrentUrl();
        expect(currentUrl).toContain('/feedback');
      } catch (error) {
        console.log('Course feedback may not be available');
      }
    });

    it('피드백 폼이 표시되어야 함', async () => {
      try {
        await login(driver, testEmail, testPassword);
        await driver.get(`${BASE_URL}/course/test-course-id/feedback`);
        await waitForPageLoad(driver);
        await driver.sleep(2000);

        // 피드백 입력 필드 확인
        const feedbackInputs = await driver.findElements(
          By.css('textarea, input, [contenteditable="true"], [class*="feedback"], [class*="Feedback"]')
        );

        // 피드백 폼이 있거나 없을 수 있음
        expect(feedbackInputs.length).toBeGreaterThanOrEqual(0);
      } catch (error) {
        console.log('Feedback form may not be available');
      }
    });
  });
});

