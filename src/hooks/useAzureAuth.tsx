/**
 * Azure AD B2C Authentication Hook
 * MSAL 기반 인증 로직
 */

import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginRequest, b2cPolicies } from '@/config/authConfig';
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
        id: account.localAccountId, // Azure AD B2C ObjectId
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
    } catch (error) {
      console.error('[Auth] Login popup error:', error);
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
   */
  const resetPassword = useCallback(async () => {
    try {
      await instance.loginRedirect({
        authority: b2cPolicies.authorities.forgotPassword.authority,
        scopes: [],
      });
    } catch (error) {
      console.error('[Auth] Password reset error:', error);
      throw error;
    }
  }, [instance]);

  /**
   * 프로필 편집
   */
  const editProfile = useCallback(async () => {
    try {
      await instance.loginRedirect({
        authority: b2cPolicies.authorities.editProfile.authority,
        scopes: [],
      });
    } catch (error) {
      console.error('[Auth] Edit profile error:', error);
      throw error;
    }
  }, [instance]);

  return {
    user,
    isAuthenticated,
    loading,
    loginPopup,
    loginRedirect,
    logout,
    logoutRedirect,
    getAccessToken,
    resetPassword,
    editProfile,
  };
}
