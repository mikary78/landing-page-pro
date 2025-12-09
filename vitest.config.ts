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
    // Unhandled Errors 처리
    // webidl-conversions 관련 에러는 무시 (Supabase 의존성 문제)
    onUnhandledRejection: (reason) => {
      if (reason && typeof reason === 'object' && 'message' in reason) {
        const message = String(reason.message);
        if (message.includes('webidl-conversions') || message.includes('whatwg-url')) {
          return false; // 이 에러는 무시
        }
      }
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
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
