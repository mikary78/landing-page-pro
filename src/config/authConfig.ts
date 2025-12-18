/**
 * Microsoft Entra ID (Azure AD) Authentication Configuration
 * MSAL (Microsoft Authentication Library) 설정
 */

import { Configuration, LogLevel } from '@azure/msal-browser';

// 환경 변수에서 읽기
const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID || '';
const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID || '';
const authority = import.meta.env.VITE_ENTRA_AUTHORITY || `https://login.microsoftonline.com/${tenantId}`;
const redirectUri = import.meta.env.VITE_ENTRA_REDIRECT_URI || 'http://localhost:5173';

/**
 * MSAL Configuration
 */
export const msalConfig: Configuration = {
  auth: {
    clientId: clientId,
    authority: authority,
    redirectUri: redirectUri,
    postLogoutRedirectUri: '/',
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: 'localStorage', // 'sessionStorage' 또는 'localStorage'
    storeAuthStateInCookie: false, // IE11/Edge 지원 시 true
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
    allowNativeBroker: false, // Disables WAM Broker
  },
};

/**
 * Scopes for API requests
 */
export const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'offline_access', 'User.Read'],
};

/**
 * Scopes for silent token acquisition
 */
export const tokenRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
  forceRefresh: false,
};

/**
 * API endpoint configuration
 */
export const apiConfig = {
  uri: import.meta.env.VITE_AZURE_FUNCTIONS_URL || 'https://func-landing-page-pro.azurewebsites.net',
  scopes: ['openid', 'profile', 'email'],
};
