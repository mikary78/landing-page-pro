import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// 각 테스트 후 자동 cleanup
afterEach(() => {
  cleanup();
});

// Node.js 환경 변수 설정 (webidl-conversions 모듈을 위한)
if (typeof globalThis !== 'undefined') {
  // @ts-ignore
  globalThis.global = globalThis;
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
