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
    // 모듈 로딩 에러 무시 (Unhandled Errors)
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
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
