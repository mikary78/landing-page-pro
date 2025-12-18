import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // E2E 테스트는 Node 환경 사용
    // E2E 테스트는 별도 setup 파일 사용하지 않음
    include: [
      'src/test/e2e/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],
    // 테스트 타임아웃 증가 (E2E는 시간이 오래 걸림)
    testTimeout: 60000, // 60초
    hookTimeout: 60000, // 60초
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
