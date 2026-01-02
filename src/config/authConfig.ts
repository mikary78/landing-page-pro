/**
 * Microsoft Entra External ID Authentication Configuration
 * MSAL (Microsoft Authentication Library) 설정
 * 일반 사용자용 이메일/비밀번호 회원가입 및 로그인 지원
 *
 * Note: Azure AD B2C는 2025년 5월 1일부로 신규 생성 불가
 * External ID가 B2C의 후속 서비스입니다.
 *
 * External ID는 User Flow가 없으므로 단순한 authority 구조 사용
 */

import { Configuration, LogLevel } from '@azure/msal-browser';

// 환경 변수에서 읽기
const tenantNameRaw = import.meta.env.VITE_ENTRA_TENANT_NAME || '';
const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID || '';
const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID || '';
const redirectUri = import.meta.env.VITE_ENTRA_REDIRECT_URI || 'http://localhost:5173';

// External ID 도메인은 항상 소문자여야 함
const tenantName = tenantNameRaw.toLowerCase();

// External ID 도메인 (ciamlogin.com)
const externalIdDomain = `${tenantName}.ciamlogin.com`;

// External ID Authority
// External ID (CIAM)는 Tenant ID를 경로에 사용
// 형식: https://{tenant}.ciamlogin.com/{tenantId}
const authority = `https://${externalIdDomain}/${tenantId}`;

/**
 * MSAL Configuration for External ID
 */
export const msalConfig: Configuration = {
  auth: {
    clientId: clientId,
    authority: authority,
    knownAuthorities: [externalIdDomain],
    redirectUri: redirectUri,
    postLogoutRedirectUri: '/',
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
        }
      },
      logLevel: LogLevel.Warning,
    },
    allowNativeBroker: false,
  },
};

/**
 * Entra ID Policies
 * Password reset와 Profile edit는 Microsoft Graph API를 통해 처리합니다.
 */
export const entraIdPolicies = {
  authority: authority,
};

/**
 * Scopes for API requests
 * External ID 기본 scopes + API scope
 */
export const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'offline_access'],
};

/**
 * API scope for Azure Functions
 * Application ID URI 형식: api://{client-id} 또는 https://{tenant}.onmicrosoft.com/api
 * 
 * Azure Portal에 등록된 scope: access_as_user
 * Scope URI: api://{client-id}/access_as_user
 */
const apiScope = `api://${clientId}/access_as_user`;

/**
 * Scopes for Azure Functions API calls
 */
export const apiRequest = {
  scopes: [apiScope],
};

/**
 * Scopes for silent token acquisition
 */
export const tokenRequest = {
  scopes: ['openid', 'profile', 'offline_access'],
  forceRefresh: false,
};

/**
 * API endpoint configuration
 */
export const apiConfig = {
  uri: import.meta.env.VITE_AZURE_FUNCTIONS_URL || 'https://func-landing-page-pro.azurewebsites.net',
  scopes: [apiScope],
};

/**
 * Microsoft Graph API scopes (for password reset, profile edit)
 */
export const graphScopes = {
  userRead: ['User.Read'],
  userReadWrite: ['User.ReadWrite'],
  passwordReset: ['User.ReadWrite.All'], // Requires admin consent
};
