/**
 * 통합 인증 Hook
 * Microsoft Entra External ID를 사용하는 인증 시스템
 * 
 * 기존 Supabase 인증에서 Azure 인증으로 마이그레이션됨
 * 기존 인터페이스를 유지하면서 내부적으로 useAzureAuth 사용
 * 
 * 변경일: 2025-12-31
 * 변경 이유: 두 개의 독립적인 인증 시스템 (Supabase, Azure) 혼재로 인한 문제 해결
 */

import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useAzureAuth, User as AzureUser } from '@/hooks/useAzureAuth';

// 기존 Supabase User 타입과 호환되는 User 타입
export interface User {
  id: string;
  email: string;
  displayName?: string;
  user_metadata?: {
    display_name?: string;
  };
}

// Azure User를 기존 User 형식으로 변환
function convertAzureUser(azureUser: AzureUser | null): User | null {
  if (!azureUser) return null;
  
  return {
    id: azureUser.id,
    email: azureUser.email || '',
    displayName: azureUser.displayName,
    user_metadata: {
      display_name: azureUser.displayName || azureUser.name || '',
    },
  };
}

export const useAuth = () => {
  const { 
    user: azureUser, 
    isAuthenticated, 
    loading, 
    loginPopup, 
    logout, 
    getAccessToken,
    resetPassword: azureResetPassword
  } = useAzureAuth();
  
  const navigate = useNavigate();
  
  // 변환된 사용자 정보 (useMemo로 캐싱하여 무한 루프 방지)
  const user = useMemo(() => convertAzureUser(azureUser), [azureUser]);
  
  // 세션 정보 (Azure는 별도 세션 객체가 없으므로 인증 상태로 대체)
  const session = useMemo(() => isAuthenticated ? { user } : null, [isAuthenticated, user]);

  /**
   * 회원가입
   * External ID에서는 로그인과 회원가입이 같은 플로우
   */
  const signUp = useCallback(async (_email: string, _password: string, _displayName?: string) => {
    try {
      console.log('[useAuth] Starting sign up via Azure popup...');
      await loginPopup();
      
      toast({
        title: "회원가입 성공",
        description: "환영합니다!",
      });
      
      navigate('/');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      console.error('[useAuth] Sign up error:', error);
      toast({
        title: "회원가입 실패",
        description: message,
        variant: "destructive",
      });
    }
  }, [loginPopup, navigate]);

  /**
   * 로그인
   */
  const signIn = useCallback(async (_email: string, _password: string) => {
    try {
      console.log('[useAuth] Starting sign in via Azure popup...');
      await loginPopup();
      
      toast({
        title: "로그인 성공",
        description: "환영합니다!",
      });
      
      navigate('/');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      console.error('[useAuth] Sign in error:', error);
      toast({
        title: "로그인 실패",
        description: message,
        variant: "destructive",
      });
    }
  }, [loginPopup, navigate]);

  /**
   * 비밀번호 재설정
   */
  const resetPassword = useCallback(async (_email: string) => {
    try {
      await azureResetPassword();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '비밀번호 재설정 중 오류가 발생했습니다.';
      toast({
        title: "비밀번호 재설정 실패",
        description: message,
        variant: "destructive",
      });
    }
  }, [azureResetPassword]);

  /**
   * 비밀번호 업데이트
   * Azure에서는 Microsoft Graph API를 통해 처리해야 함
   * 현재는 안내 메시지만 표시
   */
  const updatePassword = useCallback(async (_password: string) => {
    toast({
      title: "안내",
      description: "비밀번호 변경은 Microsoft 계정 설정에서 진행해주세요.",
    });
  }, []);

  /**
   * Google 로그인
   * Azure에서는 소셜 로그인을 External ID User Flow에서 설정해야 함
   * 현재는 기본 Azure 로그인으로 대체
   */
  const signInWithGoogle = useCallback(async () => {
    try {
      console.log('[useAuth] Google sign in - using Azure popup...');
      await loginPopup();
      
      toast({
        title: "로그인 성공",
        description: "환영합니다!",
      });
      
      navigate('/');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      toast({
        title: "로그인 실패",
        description: message,
        variant: "destructive",
      });
    }
  }, [loginPopup, navigate]);

  /**
   * 로그아웃
   */
  const signOut = useCallback(async () => {
    try {
      console.log('[useAuth] Starting sign out...');
      await logout();
      
      toast({
        title: "로그아웃 완료",
      });
      
      navigate('/');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      console.error('[useAuth] Sign out error:', error);
      toast({
        title: "로그아웃 실패",
        description: message,
        variant: "destructive",
      });
    }
  }, [logout, navigate]);

  return {
    user,
    session,
    loading,
    isAuthenticated,
    signUp,
    signIn,
    resetPassword,
    updatePassword,
    signInWithGoogle,
    signOut,
    getAccessToken,
  };
};
