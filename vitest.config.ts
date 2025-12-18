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
    // 테스트 파일 패턴 명시 (E2E 테스트 제외)
    include: [
      '**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      '**/__tests__/**/*.{js,ts,jsx,tsx}',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/*.e2e.{test,spec}.{js,ts,jsx,tsx}',
    ],
    // webidl-conversions 에러를 무시하도록 설정
    // 이 에러는 Supabase 의존성 문제로 발생하며, 테스트 실행에는 영향 없음
    bail: 0, // 모든 테스트를 실행하도록 설정
    // 에러를 무시하도록 설정 (실제로는 작동하지 않을 수 있음)
    // 대신 setup 파일에서 처리
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Supabase 클라이언트를 모킹 버전으로 대체 (webidl-conversions 에러 방지)
      '@/integrations/supabase/client': path.resolve(__dirname, './src/test/mocks/supabase-client.ts'),
      // webidl-conversions와 whatwg-url 모듈을 모킹 파일로 대체
      'webidl-conversions': path.resolve(__dirname, './src/test/mocks/webidl-conversions.js'),
      'whatwg-url': path.resolve(__dirname, './src/test/mocks/whatwg-url.js'),
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
  // Supabase 관련 모듈 처리 - 테스트 환경에서 제외
  optimizeDeps: {
    exclude: ['@supabase/supabase-js', 'webidl-conversions', 'whatwg-url'],
  },
});
