/**
 * 인증 페이지 (Auth) E2E 테스트
 * 
 * Microsoft Entra ID 기반 인증 UI 테스트
 * 
 * 테스트 항목:
 * - 로그인 페이지 로드
 * - 로그인/회원가입 모드 전환
 * - 이메일로 로그인 버튼 표시
 * - 이메일로 회원가입 버튼 표시
 * - 비밀번호 재설정 버튼 표시
 * - 설명 텍스트 표시
 * 
 * 수정일: 2026-01-08
 * 수정 내용: Microsoft Entra ID 기반 UI로 테스트 업데이트
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

describe('인증 페이지 (Auth) E2E 테스트', () => {
  let driver: WebDriver;

  beforeAll(async () => {
    driver = await createDriver();
  });

  afterAll(async () => {
    await driver.quit();
  });

  it('로그인 페이지가 정상적으로 로드되어야 함', async () => {
    await driver.get(`${BASE_URL}/auth`);
    await waitForPageLoad(driver);

    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).toContain('/auth');

    // 로그인 제목 확인 (Card 내 h2 또는 텍스트 '로그인')
    const titleElements = await driver.findElements(
      By.xpath("//*[contains(@class, 'text-2xl') and contains(text(), '로그인')] | //h2[contains(text(), '로그인')] | //*[contains(text(), '로그인') and contains(@class, 'font-bold')]")
    );
    expect(titleElements.length).toBeGreaterThan(0);
  });

  it('로그인 모드에서 이메일로 로그인 버튼이 표시되어야 함', async () => {
    await driver.get(`${BASE_URL}/auth`);
    await waitForPageLoad(driver);

    // 이메일로 로그인 버튼 확인
    const loginButton = await driver.findElement(
      By.xpath("//button[contains(text(), '이메일로 로그인')]")
    );
    expect(await loginButton.isDisplayed()).toBe(true);
  });

  it('회원가입 모드로 전환할 수 있어야 함', async () => {
    await driver.get(`${BASE_URL}/auth`);
    await waitForPageLoad(driver);

    // "계정이 없으신가요? 회원가입" 버튼 클릭 (텍스트가 혼합되어 있음)
    const signUpToggle = await driver.findElement(
      By.xpath("//button[contains(., '계정이 없으신가요')]")
    );
    await signUpToggle.click();
    await driver.sleep(500);

    // 회원가입 제목 확인
    const titleElements = await driver.findElements(
      By.xpath("//*[contains(@class, 'text-2xl') and contains(text(), '회원가입')] | //h2[contains(text(), '회원가입')] | //*[contains(text(), '회원가입') and contains(@class, 'font-bold')]")
    );
    expect(titleElements.length).toBeGreaterThan(0);
  });

  it('회원가입 모드에서 이메일로 회원가입 버튼이 표시되어야 함', async () => {
    await driver.get(`${BASE_URL}/auth`);
    await waitForPageLoad(driver);

    // 회원가입 모드로 전환
    const signUpToggle = await driver.findElement(
      By.xpath("//button[contains(., '계정이 없으신가요')]")
    );
    await signUpToggle.click();
    await driver.sleep(500);

    // 이메일로 회원가입 버튼 확인
    const signUpButton = await driver.findElement(
      By.xpath("//button[contains(text(), '이메일로 회원가입')]")
    );
    expect(await signUpButton.isDisplayed()).toBe(true);
  });

  it('회원가입 모드에서 안내 텍스트가 표시되어야 함', async () => {
    await driver.get(`${BASE_URL}/auth`);
    await waitForPageLoad(driver);

    // 회원가입 모드로 전환
    const signUpToggle = await driver.findElement(
      By.xpath("//button[contains(., '계정이 없으신가요')]")
    );
    await signUpToggle.click();
    await driver.sleep(500);

    // "계정이 없나요? 계정 만들기" 안내 텍스트 확인
    const guideText = await driver.findElements(
      By.xpath("//*[contains(text(), '계정 만들기')]")
    );
    expect(guideText.length).toBeGreaterThan(0);
  });

  it('비밀번호 재설정 버튼이 표시되어야 함', async () => {
    await driver.get(`${BASE_URL}/auth`);
    await waitForPageLoad(driver);

    // 비밀번호 재설정 버튼 찾기 (button 태그)
    const resetButton = await driver.findElement(
      By.xpath("//button[contains(text(), '비밀번호를 잊으셨나요')]")
    );
    expect(await resetButton.isDisplayed()).toBe(true);
  });

  it('Microsoft 계정 로그인 설명이 표시되어야 함', async () => {
    await driver.get(`${BASE_URL}/auth`);
    await waitForPageLoad(driver);

    // "Microsoft 계정으로 로그인하세요" 텍스트 확인
    const descriptionElements = await driver.findElements(
      By.xpath("//*[contains(text(), 'Microsoft 계정으로 로그인')]")
    );
    expect(descriptionElements.length).toBeGreaterThan(0);
  });

  it('Google 로그인 옵션 안내가 표시되어야 함', async () => {
    await driver.get(`${BASE_URL}/auth`);
    await waitForPageLoad(driver);

    // Google 로그인 옵션 안내 텍스트 확인
    const googleInfoElements = await driver.findElements(
      By.xpath("//*[contains(text(), 'Google 로그인 옵션')]")
    );
    expect(googleInfoElements.length).toBeGreaterThan(0);
  });

  it('로그인 모드와 회원가입 모드 간 전환이 원활해야 함', async () => {
    await driver.get(`${BASE_URL}/auth`);
    await waitForPageLoad(driver);

    // 1. 로그인 모드 확인
    let loginButtons = await driver.findElements(
      By.xpath("//button[contains(text(), '이메일로 로그인')]")
    );
    expect(loginButtons.length).toBeGreaterThan(0);

    // 2. 회원가입 모드로 전환 ("계정이 없으신가요? 회원가입" 버튼)
    const signUpToggle = await driver.findElement(
      By.xpath("//button[contains(., '계정이 없으신가요')]")
    );
    await signUpToggle.click();
    await driver.sleep(500);

    // 3. 회원가입 버튼 확인
    const signUpButtons = await driver.findElements(
      By.xpath("//button[contains(text(), '이메일로 회원가입')]")
    );
    expect(signUpButtons.length).toBeGreaterThan(0);

    // 4. 다시 로그인 모드로 전환 ("이미 계정이 있으신가요? 로그인" 버튼)
    const loginToggle = await driver.findElement(
      By.xpath("//button[contains(., '이미 계정이 있으신가요')]")
    );
    await loginToggle.click();
    await driver.sleep(500);

    // 5. 로그인 버튼 다시 확인
    loginButtons = await driver.findElements(
      By.xpath("//button[contains(text(), '이메일로 로그인')]")
    );
    expect(loginButtons.length).toBeGreaterThan(0);
  });

  it('회원가입 모드에서 이용약관 동의 안내가 표시되어야 함', async () => {
    await driver.get(`${BASE_URL}/auth`);
    await waitForPageLoad(driver);

    // 회원가입 모드로 전환
    const signUpToggle = await driver.findElement(
      By.xpath("//button[contains(., '계정이 없으신가요')]")
    );
    await signUpToggle.click();
    await driver.sleep(500);

    // 이용약관 동의 안내 텍스트 확인
    const termsElements = await driver.findElements(
      By.xpath("//*[contains(text(), '이용약관') or contains(text(), '개인정보처리방침')]")
    );
    expect(termsElements.length).toBeGreaterThan(0);
  });
});
