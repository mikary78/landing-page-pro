/**
 * Microsoft Entra ID (Azure AD) JWT Token Verification Middleware
 */

import { HttpRequest, InvocationContext } from '@azure/functions';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';

interface JwtPayload {
  oid: string; // Azure AD Object ID
  sub: string;
  aud?: string | string[]; // Audience
  email?: string;
  preferred_username?: string;
  name?: string;
  tid?: string; // Tenant ID
  [key: string]: any; // Allow additional properties
}

// JWKS Client 설정 (External ID와 Entra ID 모두 지원)
const tenantId = process.env.ENTRA_TENANT_ID;
const tenantName = process.env.ENTRA_TENANT_NAME;

// External ID를 사용하는 경우 ciamlogin.com 사용
// 실제 토큰의 issuer는 Tenant ID를 subdomain으로 사용함 (tenantName이 아님!)
// 형식: https://{tenantId}.ciamlogin.com/{tenantId}/discovery/v2.0/keys
const jwksUri = tenantId
  ? `https://${tenantId}.ciamlogin.com/${tenantId}/discovery/v2.0/keys`
  : `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`;

const client = new jwksClient.JwksClient({
  jwksUri: jwksUri,
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
});

/**
 * Get signing key from JWKS
 */
function getKey(header: any, callback: (err: any, key?: string) => void) {
  client.getSigningKey(header.kid, (err: any, key?: jwksClient.SigningKey) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Verify JWT token
 * Supports both standard Entra ID and Entra External ID tokens
 */
export async function verifyToken(token: string): Promise<JwtPayload> {
  return new Promise((resolve, reject) => {
    const clientId = process.env.ENTRA_CLIENT_ID || '';

    // External ID와 일반 Entra ID 모두 지원
    const validIssuers: string[] = [];

    // External ID issuer - 두 가지 형식 모두 지원
    // 형식 1: https://{tenantName}.ciamlogin.com/{tenantId}/v2.0
    // 형식 2: https://{tenantId}.ciamlogin.com/{tenantId}/v2.0 (실제 토큰에서 사용되는 형식)
    if (tenantId) {
      // Tenant ID를 subdomain으로 사용하는 형식 (실제 토큰에서 사용됨)
      validIssuers.push(
        `https://${tenantId}.ciamlogin.com/${tenantId}/v2.0`
      );
    }
    
    if (tenantName) {
      // Tenant Name을 subdomain으로 사용하는 형식
      validIssuers.push(
        `https://${tenantName.toLowerCase()}.ciamlogin.com/${tenantId}/v2.0`
      );
    }

    // Standard Entra ID issuers (fallback)
    if (tenantId) {
      validIssuers.push(
        `https://sts.windows.net/${tenantId}/`, // v1.0 format
        `https://login.microsoftonline.com/${tenantId}/v2.0` // v2.0 format
      );
    }
    
    console.log('[Auth] Valid issuers:', validIssuers);

    // External ID와 표준 Entra ID audience 모두 지원
    // API scope 토큰의 audience는 api://{client-id} 형식 또는 client-id 자체일 수 있음
    const validAudiences: string[] = [
      `api://${clientId}`, // Application ID URI 형식 (API scope 토큰)
      clientId, // Client ID 자체 (External ID의 경우 토큰의 aud가 client-id일 수 있음)
    ];
    
    if (tenantName) {
      validAudiences.push(`https://${tenantName.toLowerCase()}.onmicrosoft.com/api`);
    }
    
    // Microsoft Graph 기본 audience도 허용 (임시 - ID 토큰의 경우)
    // TODO: API scope를 올바르게 요청하도록 수정 후 제거
    validAudiences.push('00000003-0000-0000-c000-000000000000');
    
    console.log('[Auth] Valid audiences:', validAudiences);
    console.log('[Auth] Client ID:', clientId);

    // jwt.verify는 audience와 issuer를 단일 값, 배열, 또는 정규식을 받을 수 있음
    // audience와 issuer 검증을 수동 검증으로 처리 (옵션에서 제거)
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ['RS256'],
        // audience와 issuer는 검증 후 수동으로 확인
      },
      (err: any, decoded: any) => {
        if (err) {
          // 서명 검증 실패 등의 에러만 처리
          console.error('[Auth] JWT verification failed:', err.message);
          
          // 토큰 payload 디코딩 시도 (에러 정보 확인용)
          try {
            const parts = token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            console.error('[Auth] Actual token audience:', payload.aud);
            console.error('[Auth] Actual token issuer:', payload.iss);
            console.error('[Auth] Actual token client_id (appid):', payload.appid);
          } catch (parseErr) {
            // 무시
          }
          
          reject(err);
          return;
        }

        // 디코딩 성공 - 수동으로 audience와 issuer 검증
        const payload = decoded as JwtPayload;
        const aud = Array.isArray(payload.aud) ? payload.aud[0] : payload.aud;
        const iss = payload.iss;

        // Issuer 검증 (audience 검증보다 먼저)
        if (!iss) {
          console.error('[Auth] No issuer in token');
          reject(new Error('No issuer in token'));
          return;
        }

        // Issuer가 validIssuers 중 하나인지 확인 (대소문자 구분 없이)
        const issuerMatch = validIssuers.some(validIss => {
          // 정확히 일치하거나, External ID issuer 형식인 경우
          return iss === validIss || iss.toLowerCase() === validIss.toLowerCase();
        });

        if (!issuerMatch) {
          console.error('[Auth] Invalid issuer:', iss);
          console.error('[Auth] Expected one of:', validIssuers);
          reject(new Error(`Invalid issuer: ${iss}. Expected one of: ${validIssuers.join(', ')}`));
          return;
        }

        // Audience 검증
        if (!aud) {
          console.error('[Auth] No audience in token');
          reject(new Error('No audience in token'));
          return;
        }

        // Audience가 validAudiences 중 하나인지 확인
        const audienceMatch = validAudiences.some(validAud => {
          // 정확히 일치하는지 확인
          return aud === validAud || aud.toLowerCase() === validAud.toLowerCase();
        });

        if (!audienceMatch) {
          console.error('[Auth] ❌ Invalid audience:', aud);
          console.error('[Auth] Expected one of:', validAudiences);
          console.error('[Auth] Client ID from env:', clientId);
          console.error('[Auth] Tenant ID from env:', tenantId);
          console.error('[Auth] Tenant Name from env:', tenantName);
          reject(new Error(`Invalid audience: ${aud}. Expected one of: ${validAudiences.join(', ')}`));
          return;
        }

        console.log('[Auth] ✅ Audience match successful:', aud);

        console.log('[Auth] Token verified successfully. Audience:', aud, 'Issuer:', iss);
        resolve(payload);
      }
    );
  });
}

/**
 * Extract token from Authorization header
 */
export function extractToken(request: HttpRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Authenticate request and extract user ID
 */
export async function authenticateRequest(
  request: HttpRequest,
  context: InvocationContext
): Promise<{ userId: string; email: string; name: string } | null> {
  try {
    // 개발 환경에서만 허용되는 Auth Bypass (UI/로컬 테스트 용도)
    // - 조건: DEV_AUTH_BYPASS=true AND AZURE_FUNCTIONS_ENVIRONMENT=Development
    // - 헤더: x-dev-user-id (UUID), x-dev-email, x-dev-name
    const devBypassEnabled =
      (process.env.DEV_AUTH_BYPASS || '').toLowerCase() === 'true' &&
      (process.env.AZURE_FUNCTIONS_ENVIRONMENT || '').toLowerCase() === 'development';

    if (devBypassEnabled) {
      const devUserId = request.headers.get('x-dev-user-id');
      if (devUserId) {
        const uuidLike =
          /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
            devUserId
          );
        if (!uuidLike) {
          context.warn('[Auth] DEV_AUTH_BYPASS enabled but x-dev-user-id is not a UUID');
          return null;
        }

        return {
          userId: devUserId,
          email: request.headers.get('x-dev-email') || 'dev@example.com',
          name: request.headers.get('x-dev-name') || 'Dev User',
        };
      }
    }

    const token = extractToken(request);
    if (!token) {
      context.log('[Auth] No token provided');
      return null;
    }

    const payload = await verifyToken(token);
    context.log('[Auth] Token verified successfully:', payload.oid);

    return {
      userId: payload.oid, // Azure AD Object ID
      email: payload.email || payload.preferred_username || '',
      name: payload.name || '',
    };
  } catch (error) {
    context.error('[Auth] Token verification failed:', error);
    return null;
  }
}

/**
 * Require authentication middleware
 */
export async function requireAuth(
  request: HttpRequest,
  context: InvocationContext
): Promise<{ userId: string; email: string; name: string }> {
  const user = await authenticateRequest(request, context);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
