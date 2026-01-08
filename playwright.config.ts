import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Playwright 설정 파일
 * Azure Functions 통합 테스트를 위한 E2E 테스트 설정
 * 
 * 참고: https://playwright.dev/docs/test-configuration
 */

// ES 모듈에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  // 프로젝트 루트 디렉토리 명시
  rootDir: path.resolve(__dirname),
  
  testDir: './src/test/playwright',
  
  // 테스트 매칭 패턴 - 프로젝트 내 테스트만 실행
  testMatch: /.*\.test\.ts$/,
  
  // 테스트 무시 패턴 - 다른 프로젝트의 테스트 제외
  testIgnore: [
    /node_modules/,
    /\.vscode/,
    /GM/,
    /AppData/,
    /C:\\Users\\mikar\\.vscode/,
    /C:\\Users\\mikar\\GM/,
    /C:\\Users\\mikar\\AppData/,
  ],
  
  // 테스트 실행 옵션
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // 리포트 설정
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  
  // 공유 설정
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // 프로젝트별 브라우저 설정
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // 필요시 다른 브라우저 추가
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // 개발 서버 설정 (필요시)
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:5173',
  //   reuseExistingServer: !process.env.CI,
  // },
});

