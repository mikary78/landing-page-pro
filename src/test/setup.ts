import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// webidl-conversions 에러를 미리 처리
// 이 에러는 Supabase 의존성 문제로 발생하며, 테스트 실행에는 영향 없음
const originalError = console.error;
console.error = (...args: unknown[]) => {
  const message = args.join(' ');
  if (
    message.includes('webidl-conversions') ||
    message.includes('whatwg-url') ||
    message.includes("Cannot read properties of undefined (reading 'get')")
  ) {
    // 이 에러는 무시
    return;
  }
  originalError(...args);
};

// 각 테스트 후 자동 cleanup
afterEach(() => {
  cleanup();
});

// Node.js 환경 변수 설정 (webidl-conversions 모듈을 위한)
// jsdom 환경에서 Node.js 전역 변수 제공
if (typeof globalThis !== 'undefined') {
  // @ts-expect-error - globalThis에 global 속성을 추가하여 Node.js polyfill 제공
  globalThis.global = globalThis;
  
  // process 객체가 없는 경우 빈 객체로 설정
  if (typeof process === 'undefined') {
    // @ts-expect-error - process 객체를 전역에 추가
    globalThis.process = { env: {} } as NodeJS.Process;
  }
}

// Supabase 클라이언트 모킹 (필요한 경우)
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          maybeSingle: vi.fn(),
        })),
      })),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    })),
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));
