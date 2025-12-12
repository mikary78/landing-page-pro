/**
 * Supabase Auth API 테스트
 * 
 * 테스트 대상:
 * - signUp: 회원가입
 * - signIn: 로그인
 * - signOut: 로그아웃
 * - resetPasswordForEmail: 비밀번호 재설정 이메일 전송
 * - updateUser: 사용자 정보 업데이트
 * - signInWithOAuth: OAuth 로그인
 * - getSession: 현재 세션 가져오기
 * - onAuthStateChange: 인증 상태 변경 감지
 * 
 * 출처: @supabase/supabase-js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/test/mocks/supabase-client';

// Mock 데이터
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
  app_metadata: {},
  user_metadata: {
    display_name: 'Test User',
  },
};

const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: mockUser,
};

describe('Supabase Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('signUp', () => {
    it('회원가입 성공 시 사용자 정보와 세션을 반환해야 함', async () => {
      const email = 'newuser@example.com';
      const password = 'securePassword123!';
      const displayName = 'New User';

      // Mock 설정
      const mockSignUp = vi.spyOn(supabase.auth, 'signUp').mockResolvedValue({
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      });

      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      expect(mockSignUp).toHaveBeenCalledWith({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      expect(result.data?.user).toBeDefined();
      expect(result.data?.user?.email).toBe(mockUser.email);
      expect(result.error).toBeNull();
    });

    it('이미 존재하는 이메일로 회원가입 시 에러를 반환해야 함', async () => {
      const email = 'existing@example.com';
      const password = 'password123';

      const mockError = {
        message: 'User already registered',
        status: 400,
      };

      const mockSignUp = vi.spyOn(supabase.auth, 'signUp').mockResolvedValue({
        data: {
          user: null,
          session: null,
        },
        error: mockError as any,
      });

      const result = await supabase.auth.signUp({
        email,
        password,
      });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('User already registered');
    });

    it('약한 비밀번호로 회원가입 시 에러를 반환해야 함', async () => {
      const email = 'test@example.com';
      const password = '123'; // 너무 짧은 비밀번호

      const mockError = {
        message: 'Password should be at least 6 characters',
        status: 400,
      };

      const mockSignUp = vi.spyOn(supabase.auth, 'signUp').mockResolvedValue({
        data: {
          user: null,
          session: null,
        },
        error: mockError as any,
      });

      const result = await supabase.auth.signUp({
        email,
        password,
      });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Password');
    });
  });

  describe('signInWithPassword', () => {
    it('올바른 이메일과 비밀번호로 로그인 시 세션을 반환해야 함', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      const mockSignIn = vi
        .spyOn(supabase.auth, 'signInWithPassword')
        .mockResolvedValue({
          data: {
            user: mockUser,
            session: mockSession,
          },
          error: null,
        });

      const result = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      expect(mockSignIn).toHaveBeenCalledWith({
        email,
        password,
      });

      expect(result.data?.session).toBeDefined();
      expect(result.data?.user).toBeDefined();
      expect(result.error).toBeNull();
    });

    it('잘못된 이메일 또는 비밀번호로 로그인 시 에러를 반환해야 함', async () => {
      const email = 'wrong@example.com';
      const password = 'wrongpassword';

      const mockError = {
        message: 'Invalid login credentials',
        status: 400,
      };

      const mockSignIn = vi
        .spyOn(supabase.auth, 'signInWithPassword')
        .mockResolvedValue({
          data: {
            user: null,
            session: null,
          },
          error: mockError as any,
        });

      const result = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Invalid login credentials');
    });
  });

  describe('signOut', () => {
    it('로그아웃 시 성공적으로 세션을 종료해야 함', async () => {
      const mockSignOut = vi.spyOn(supabase.auth, 'signOut').mockResolvedValue({
        error: null,
      });

      const result = await supabase.auth.signOut();

      expect(mockSignOut).toHaveBeenCalled();
      expect(result.error).toBeNull();
    });

    it('로그아웃 시 에러가 발생하면 에러를 반환해야 함', async () => {
      const mockError = {
        message: 'Sign out failed',
        status: 500,
      };

      const mockSignOut = vi.spyOn(supabase.auth, 'signOut').mockResolvedValue({
        error: mockError as any,
      });

      const result = await supabase.auth.signOut();

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Sign out failed');
    });
  });

  describe('resetPasswordForEmail', () => {
    it('비밀번호 재설정 이메일을 성공적으로 전송해야 함', async () => {
      const email = 'test@example.com';
      const redirectUrl = 'https://example.com/reset-password';

      const mockResetPassword = vi
        .spyOn(supabase.auth, 'resetPasswordForEmail')
        .mockResolvedValue({
          data: {},
          error: null,
        });

      const result = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      expect(mockResetPassword).toHaveBeenCalledWith(email, {
        redirectTo: redirectUrl,
      });

      expect(result.error).toBeNull();
    });

    it('존재하지 않는 이메일로 재설정 요청 시 에러를 반환해야 함', async () => {
      const email = 'nonexistent@example.com';

      const mockError = {
        message: 'User not found',
        status: 404,
      };

      const mockResetPassword = vi
        .spyOn(supabase.auth, 'resetPasswordForEmail')
        .mockResolvedValue({
          data: {},
          error: mockError as any,
        });

      const result = await supabase.auth.resetPasswordForEmail(email);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('User not found');
    });
  });

  describe('updateUser', () => {
    it('비밀번호 업데이트가 성공적으로 처리되어야 함', async () => {
      const newPassword = 'newSecurePassword123!';

      const mockUpdateUser = vi
        .spyOn(supabase.auth, 'updateUser')
        .mockResolvedValue({
          data: {
            user: { ...mockUser },
            session: mockSession,
          },
          error: null,
        });

      const result = await supabase.auth.updateUser({
        password: newPassword,
      });

      expect(mockUpdateUser).toHaveBeenCalledWith({
        password: newPassword,
      });

      expect(result.data?.user).toBeDefined();
      expect(result.error).toBeNull();
    });

    it('사용자 메타데이터 업데이트가 성공적으로 처리되어야 함', async () => {
      const newDisplayName = 'Updated Name';

      const mockUpdateUser = vi
        .spyOn(supabase.auth, 'updateUser')
        .mockResolvedValue({
          data: {
            user: {
              ...mockUser,
              user_metadata: {
                display_name: newDisplayName,
              },
            },
            session: mockSession,
          },
          error: null,
        });

      const result = await supabase.auth.updateUser({
        data: {
          display_name: newDisplayName,
        },
      });

      expect(mockUpdateUser).toHaveBeenCalledWith({
        data: {
          display_name: newDisplayName,
        },
      });

      expect(result.data?.user?.user_metadata?.display_name).toBe(
        newDisplayName
      );
      expect(result.error).toBeNull();
    });
  });

  describe('signInWithOAuth', () => {
    it('Google OAuth 로그인이 성공적으로 시작되어야 함', async () => {
      const provider = 'google';
      const options = {
        redirectTo: 'https://example.com/callback',
      };

      const mockSignInWithOAuth = vi
        .spyOn(supabase.auth, 'signInWithOAuth')
        .mockResolvedValue({
          data: {
            url: 'https://accounts.google.com/oauth/authorize?...',
            provider,
          },
          error: null,
        });

      const result = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options,
      });

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: provider as any,
        options,
      });

      expect(result.data?.url).toBeDefined();
      expect(result.error).toBeNull();
    });
  });

  describe('getSession', () => {
    it('현재 세션을 성공적으로 가져와야 함', async () => {
      const mockGetSession = vi
        .spyOn(supabase.auth, 'getSession')
        .mockResolvedValue({
          data: {
            session: mockSession,
          },
          error: null,
        });

      const result = await supabase.auth.getSession();

      expect(mockGetSession).toHaveBeenCalled();
      expect(result.data?.session).toBeDefined();
      expect(result.data?.session?.user).toBeDefined();
      expect(result.error).toBeNull();
    });

    it('세션이 없을 때 null을 반환해야 함', async () => {
      const mockGetSession = vi
        .spyOn(supabase.auth, 'getSession')
        .mockResolvedValue({
          data: {
            session: null,
          },
          error: null,
        });

      const result = await supabase.auth.getSession();

      expect(result.data?.session).toBeNull();
      expect(result.error).toBeNull();
    });
  });

  describe('onAuthStateChange', () => {
    it('인증 상태 변경을 감지해야 함', () => {
      const mockCallback = vi.fn();

      const mockOnAuthStateChange = vi
        .spyOn(supabase.auth, 'onAuthStateChange')
        .mockReturnValue({
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        } as any);

      const { data } = supabase.auth.onAuthStateChange(mockCallback);

      expect(mockOnAuthStateChange).toHaveBeenCalledWith(mockCallback);
      expect(data.subscription).toBeDefined();
      expect(data.subscription.unsubscribe).toBeDefined();
    });
  });
});

