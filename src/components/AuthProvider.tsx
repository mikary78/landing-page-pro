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
        console.log('[AuthProvider] MSAL Event:', event.eventType);

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
          // MSAL 에러 상세 정보 로깅
          if (event.error) {
            const error = event.error as any;
            console.error('[Auth] Error code:', error.errorCode);
            console.error('[Auth] Error message:', error.errorMessage);
            console.error('[Auth] Error details:', error);
          }
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

  console.log('[AuthProvider] MSAL initialized, rendering children');
  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}
