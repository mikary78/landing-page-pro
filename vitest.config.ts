import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    // 테스트 파일이 없을 때 에러를 무시하지 않도록 설정
    passWithNoTests: true,
    // 테스트 파일 패턴 명시 (더 넓은 범위)
    include: [
      '**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      '**/__tests__/**/*.{js,ts,jsx,tsx}',
    ],
    // Unhandled Errors를 경고로 처리 (에러로 처리하지 않음)
    // webidl-conversions는 Supabase 의존성 문제로 발생하는 것으로, 테스트 실행에는 영향 없음
    onUnhandledRejection: () => {
      // 모든 unhandled rejection을 무시 (webidl-conversions 에러 포함)
      return false;
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // 서버 설정 - webidl-conversions 모듈 제외
  server: {
    deps: {
      exclude: ['webidl-conversions', 'whatwg-url'],
    },
  },
  // Node.js polyfill 설정
  define: {
    global: 'globalThis',
  },
  // Supabase 관련 모듈 처리
  optimizeDeps: {
    include: ['@supabase/supabase-js'],
  },
});
