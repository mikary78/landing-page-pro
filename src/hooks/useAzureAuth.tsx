/**
 * Microsoft Entra External ID Authentication Hook
 * MSAL 기반 인증 로직
 */

import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginRequest, graphScopes } from '@/config/authConfig';
import { useCallback, useEffect, useState } from 'react';

export interface User {
  id: string;
  email: string;
  displayName: string;
  name?: string;
}

export function useAzureAuth() {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 사용자 정보 추출
  useEffect(() => {
    if (isAuthenticated && accounts.length > 0) {
      const account = accounts[0];
      const idTokenClaims = account.idTokenClaims as any;

      setUser({
        id: account.localAccountId, // External ID ObjectId
        email: idTokenClaims?.emails?.[0] || idTokenClaims?.email || '',
        displayName: idTokenClaims?.name || account.name || '',
        name: idTokenClaims?.given_name || '',
      });
    } else {
      setUser(null);
    }

    setLoading(inProgress !== InteractionStatus.None);
  }, [isAuthenticated, accounts, inProgress]);

  /**
   * 로그인 (팝업)
   */
  const loginPopup = useCallback(async () => {
    try {
      const response = await instance.loginPopup(loginRequest);
      console.log('[Auth] Login popup success:', response.account?.username);
      return response.account;
    } catch (error: any) {
      console.error('[Auth] Login popup error:', error);
      // MSAL 에러 상세 정보 로깅
      if (error.errorCode) {
        console.error('[Auth] Error code:', error.errorCode);
        console.error('[Auth] Error message:', error.errorMessage);
        console.error('[Auth] Error details:', error);
      }
      throw error;
    }
  }, [instance]);

  /**
   * 회원가입 (팝업)
   * External ID에서 회원가입 화면을 직접 표시
   */
  const signupPopup = useCallback(async () => {
    try {
      // 회원가입 화면을 표시하기 위해 extraQueryParameters 사용
      // prompt=login을 사용하여 항상 로그인 화면 표시 (기존 세션 무시)
      const signupRequest = {
        ...loginRequest,
        prompt: 'login', // 기존 세션 무시하고 로그인 화면 표시
        extraQueryParameters: {
          // External ID에서 회원가입 화면으로 직접 이동하기 위한 힌트
          // 사용자가 "계정 만들기" 링크를 클릭할 필요 없이 바로 회원가입 흐름으로 유도
        },
      };
      const response = await instance.loginPopup(signupRequest);
      console.log('[Auth] Signup popup success:', response.account?.username);
      return response.account;
    } catch (error) {
      console.error('[Auth] Signup popup error:', error);
      throw error;
    }
  }, [instance]);

  /**
   * 로그인 (리다이렉트)
   */
  const loginRedirect = useCallback(async () => {
    try {
      await instance.loginRedirect(loginRequest);
    } catch (error) {
      console.error('[Auth] Login redirect error:', error);
      throw error;
    }
  }, [instance]);

  /**
   * 로그아웃
   */
  const logout = useCallback(async () => {
    try {
      await instance.logoutPopup({
        postLogoutRedirectUri: '/',
        mainWindowRedirectUri: '/',
      });
      console.log('[Auth] Logout success');
    } catch (error) {
      console.error('[Auth] Logout error:', error);
      throw error;
    }
  }, [instance]);

  /**
   * 로그아웃 (리다이렉트)
   */
  const logoutRedirect = useCallback(async () => {
    try {
      await instance.logoutRedirect({
        postLogoutRedirectUri: '/',
      });
    } catch (error) {
      console.error('[Auth] Logout redirect error:', error);
      throw error;
    }
  }, [instance]);

  /**
   * 액세스 토큰 가져오기 (API 호출용)
   */
  const getAccessToken = useCallback(async () => {
    if (accounts.length === 0) {
      throw new Error('No active account');
    }

    const account = accounts[0];
    const request = {
      ...loginRequest,
      account: account,
    };

    try {
      // Silent token acquisition
      const response = await instance.acquireTokenSilent(request);
      return response.accessToken;
    } catch (error) {
      console.warn('[Auth] Silent token acquisition failed, trying popup...');
      // Fallback to popup
      const response = await instance.acquireTokenPopup(request);
      return response.accessToken;
    }
  }, [instance, accounts]);

  /**
   * 비밀번호 재설정
   * External ID는 Self-Service Password Reset 사용
   * Azure Portal에서 SSPR이 활성화되어 있어야 함
   */
  const resetPassword = useCallback(async () => {
    try {
      console.log('[Auth] Password reset - User should use Azure SSPR or forgot password link');
      // External ID는 로그인 화면에서 "Forgot password?" 링크를 제공
      // 또는 Azure Portal의 SSPR 기능 사용
      window.alert('비밀번호 재설정은 로그인 화면의 "비밀번호를 잊으셨나요?" 링크를 사용하세요.');
    } catch (error) {
      console.error('[Auth] Password reset error:', error);
      throw error;
    }
  }, []);

  /**
   * 프로필 편집
   * Microsoft Graph API를 사용하여 프로필 수정
   */
  const editProfile = useCallback(async (profileData: { displayName?: string; givenName?: string; surname?: string }) => {
    try {
      console.log('[Auth] Starting profile edit...');

      if (accounts.length === 0) {
        throw new Error('No active account');
      }

      // Microsoft Graph API 토큰 요청
      const response = await instance.acquireTokenPopup({
        scopes: graphScopes.userReadWrite,
        account: accounts[0],
      });

      const accessToken = response.accessToken;

      // Microsoft Graph API로 프로필 업데이트
      const graphEndpoint = 'https://graph.microsoft.com/v1.0/me';

      const updateResponse = await fetch(graphEndpoint, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update profile');
      }

      console.log('[Auth] Profile updated successfully');
    } catch (error) {
      console.error('[Auth] Profile edit error:', error);
      throw error;
    }
  }, [instance, accounts]);

  return {
    user,
    isAuthenticated,
    loading,
    loginPopup,
    signupPopup,
    loginRedirect,
    logout,
    logoutRedirect,
    getAccessToken,
    resetPassword,
    editProfile,
  };
}
