/**
 * Microsoft Entra External ID Authentication Provider
 * MSAL React 래퍼 컴포넌트
 */

import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication, EventType, EventMessage, AuthenticationResult } from '@azure/msal-browser';
import { msalConfig } from '@/config/authConfig';
import { ReactNode, useEffect, useState, useRef } from 'react';

// MSAL 인스턴스 생성 (싱글톤)
let msalInstanceSingleton: PublicClientApplication | null = null;

function getMsalInstance(): PublicClientApplication {
  if (!msalInstanceSingleton) {
    console.log('[AuthProvider] Creating new MSAL instance');
    msalInstanceSingleton = new PublicClientApplication(msalConfig);
  } else {
    console.log('[AuthProvider] Reusing existing MSAL instance');
  }
  return msalInstanceSingleton;
}

export const msalInstance = getMsalInstance();

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * MSAL Provider 래퍼
 * App.tsx에서 최상위에 배치
 */
export function AuthProvider({ children }: AuthProviderProps) {
  // 로컬 개발 편의: Entra 설정 없이도 UI를 확인할 수 있도록 bypass 지원
  // (API 호출은 프론트에서 x-dev-user-id 헤더로 동작)
  if (import.meta.env.VITE_DEV_AUTH_BYPASS === 'true') {
    return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
  }

  const [isInitialized, setIsInitialized] = useState(false);
  const initializingRef = useRef(false);

  useEffect(() => {
    // 이미 초기화 중이거나 완료되었으면 스킵
    if (initializingRef.current || isInitialized) {
      console.log('[AuthProvider] Already initializing or initialized, skipping...');
      return;
    }

    initializingRef.current = true;
    console.log('[AuthProvider] Starting MSAL initialization...');
    console.log('[AuthProvider] MSAL Config:', msalConfig);

    // MSAL 초기화
    msalInstance.initialize().then(() => {
      console.log('[AuthProvider] MSAL initialized successfully');

      const accounts = msalInstance.getAllAccounts();
      console.log('[AuthProvider] Accounts found:', accounts.length);

      if (accounts.length > 0) {
        msalInstance.setActiveAccount(accounts[0]);
        console.log('[AuthProvider] Active account set:', accounts[0].username);
      }

      // 이벤트 리스너 등록 (한 번만)
      msalInstance.addEventCallback((event: EventMessage) => {
        // 로그인/로그아웃 이벤트만 로깅 (토큰 획득은 무시)
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

      setIsInitialized(true);
    }).catch((error) => {
      console.error('[AuthProvider] MSAL initialization failed:', error);
      initializingRef.current = false;
    });
  }, [isInitialized]);

  if (!isInitialized) {
    console.log('[AuthProvider] Waiting for MSAL initialization...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">인증 시스템 초기화 중...</p>
        </div>
      </div>
    );
  }

  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}
