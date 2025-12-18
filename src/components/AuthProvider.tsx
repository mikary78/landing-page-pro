/**
 * Azure AD B2C Authentication Provider
 * MSAL React 래퍼 컴포넌트
 */

import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication, EventType, EventMessage, AuthenticationResult } from '@azure/msal-browser';
import { msalConfig } from '@/config/authConfig';
import { ReactNode } from 'react';

// MSAL 인스턴스 생성
export const msalInstance = new PublicClientApplication(msalConfig);

// 계정 선택 (초기화 시)
msalInstance.initialize().then(() => {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0]);
  }

  // 이벤트 리스너 등록
  msalInstance.addEventCallback((event: EventMessage) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
      const payload = event.payload as AuthenticationResult;
      const account = payload.account;
      msalInstance.setActiveAccount(account);

      console.log('[Auth] Login success:', account?.username);
    }

    if (event.eventType === EventType.LOGOUT_SUCCESS) {
      console.log('[Auth] Logout success');
    }

    if (event.eventType === EventType.LOGIN_FAILURE) {
      console.error('[Auth] Login failure:', event.error);
    }
  });
});

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * MSAL Provider 래퍼
 * App.tsx에서 최상위에 배치
 */
export function AuthProvider({ children }: AuthProviderProps) {
  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}
