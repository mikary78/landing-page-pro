// Supabase 클라이언트 모킹
// 테스트 환경에서 webidl-conversions 에러를 방지하기 위한 모킹
import { vi } from 'vitest';

export const supabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        maybeSingle: vi.fn(),
        order: vi.fn(() => ({
          limit: vi.fn(),
        })),
      })),
      order: vi.fn(() => ({
        limit: vi.fn(),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(),
      select: vi.fn(),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(),
    })),
  })),
  auth: {
    getUser: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
  functions: {
    invoke: vi.fn(),
  },
  channel: vi.fn(() => ({
    on: vi.fn(() => ({
      subscribe: vi.fn(),
    })),
    subscribe: vi.fn(),
  })),
  removeChannel: vi.fn(),
  storage: {
    from: vi.fn(),
  },
  rpc: vi.fn(),
};

