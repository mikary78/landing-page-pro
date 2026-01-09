/**
 * 공유 인증 유틸리티
 * 
 * Microsoft Entra ID 기반 JWT 토큰 검증 미들웨어입니다.
 * 모든 마이크로서비스에서 일관된 인증 처리를 위해 사용합니다.
 * 
 * @see https://learn.microsoft.com/entra/identity-platform/
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// ============================================
// Types
// ============================================

export interface UserInfo {
  /** 사용자 고유 ID (sub claim) */
  userId: string;
  /** 이메일 주소 */
  email?: string;
  /** 사용자 이름 */
  name?: string;
  /** 역할 */
  roles?: string[];
  /** 테넌트 ID */
  tenantId?: string;
  /** 원본 토큰 클레임 */
  claims: Record<string, unknown>;
}

export interface AuthConfig {
  tenantId: string;
  clientId: string;
  issuer?: string;
  jwksUri?: string;
}

export interface AuthenticatedRequest extends HttpRequest {
  user?: UserInfo;
}

export type AuthHandler = (
  request: AuthenticatedRequest,
  context: InvocationContext
) => Promise<HttpResponseInit>;

// ============================================
// Configuration
// ============================================

let authConfig: AuthConfig | null = null;
let jwksClientInstance: jwksClient.JwksClient | null = null;

/**
 * 인증 설정 초기화
 */
export function initializeAuth(config?: Partial<AuthConfig>): void {
  const tenantId = config?.tenantId || process.env.ENTRA_TENANT_ID || '';
  const clientId = config?.clientId || process.env.ENTRA_CLIENT_ID || '';
  
  if (!tenantId || !clientId) {
    console.warn('[Auth] Missing ENTRA_TENANT_ID or ENTRA_CLIENT_ID');
  }

  // Entra External ID 또는 Azure AD 지원
  const tenantName = process.env.ENTRA_TENANT_NAME || tenantId;
  const isExternalId = process.env.ENTRA_IS_EXTERNAL_ID === 'true';
  
  const baseUrl = isExternalId
    ? `https://${tenantName}.ciamlogin.com/${tenantId}`
    : `https://login.microsoftonline.com/${tenantId}`;

  authConfig = {
    tenantId,
    clientId,
    issuer: config?.issuer || `${baseUrl}/v2.0`,
    jwksUri: config?.jwksUri || `${baseUrl}/discovery/v2.0/keys`,
  };

  jwksClientInstance = jwksClient({
    jwksUri: authConfig.jwksUri,
    cache: true,
    cacheMaxAge: 600000, // 10분
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  });

  console.log('[Auth] Initialized with tenant:', tenantId);
}

/**
 * 인증 설정 가져오기
 */
export function getAuthConfig(): AuthConfig {
  if (!authConfig) {
    initializeAuth();
  }
  return authConfig!;
}

// ============================================
// Token Validation
// ============================================

/**
 * JWKS에서 서명 키 가져오기
 */
async function getSigningKey(kid: string): Promise<string> {
  if (!jwksClientInstance) {
    initializeAuth();
  }

  return new Promise((resolve, reject) => {
    jwksClientInstance!.getSigningKey(kid, (err, key) => {
      if (err) {
        reject(err);
        return;
      }
      const signingKey = key?.getPublicKey();
      if (!signingKey) {
        reject(new Error('Unable to get signing key'));
        return;
      }
      resolve(signingKey);
    });
  });
}

/**
 * JWT 토큰 검증
 */
export async function verifyToken(token: string): Promise<UserInfo> {
  const config = getAuthConfig();

  // 토큰 디코딩 (검증 없이)
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === 'string') {
    throw new Error('Invalid token format');
  }

  const { header, payload } = decoded;
  
  // 서명 키 가져오기
  const signingKey = await getSigningKey(header.kid!);

  // 토큰 검증
  const verified = jwt.verify(token, signingKey, {
    algorithms: ['RS256'],
    issuer: config.issuer,
    audience: config.clientId,
  }) as jwt.JwtPayload;

  // UserInfo 생성
  return {
    userId: verified.sub || verified.oid || '',
    email: verified.email || verified.preferred_username || verified.emails?.[0],
    name: verified.name || verified.given_name,
    roles: verified.roles || [],
    tenantId: verified.tid,
    claims: verified as Record<string, unknown>,
  };
}

/**
 * Authorization 헤더에서 토큰 추출
 */
export function extractToken(request: HttpRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}

// ============================================
// Middleware
// ============================================

/**
 * 인증 필수 미들웨어
 */
export function requireAuth(handler: AuthHandler): AuthHandler {
  return async (request: AuthenticatedRequest, context: InvocationContext) => {
    const token = extractToken(request);
    
    if (!token) {
      return {
        status: 401,
        jsonBody: { error: 'Unauthorized', message: 'Missing authorization token' },
      };
    }

    try {
      const user = await verifyToken(token);
      request.user = user;
      return handler(request, context);
    } catch (error) {
      console.error('[Auth] Token verification failed:', error);
      return {
        status: 401,
        jsonBody: { error: 'Unauthorized', message: 'Invalid or expired token' },
      };
    }
  };
}

/**
 * 인증 선택적 미들웨어 (토큰이 있으면 검증, 없어도 통과)
 */
export function optionalAuth(handler: AuthHandler): AuthHandler {
  return async (request: AuthenticatedRequest, context: InvocationContext) => {
    const token = extractToken(request);
    
    if (token) {
      try {
        const user = await verifyToken(token);
        request.user = user;
      } catch (error) {
        console.warn('[Auth] Optional auth token verification failed:', error);
        // 토큰이 유효하지 않아도 계속 진행
      }
    }
    
    return handler(request, context);
  };
}

/**
 * 역할 기반 인증 미들웨어
 */
export function requireRoles(...requiredRoles: string[]): (handler: AuthHandler) => AuthHandler {
  return (handler: AuthHandler) => {
    return requireAuth(async (request: AuthenticatedRequest, context: InvocationContext) => {
      const userRoles = request.user?.roles || [];
      const hasRole = requiredRoles.some(role => userRoles.includes(role));
      
      if (!hasRole) {
        return {
          status: 403,
          jsonBody: { 
            error: 'Forbidden', 
            message: `Required roles: ${requiredRoles.join(', ')}` 
          },
        };
      }
      
      return handler(request, context);
    });
  };
}

/**
 * 관리자 전용 미들웨어
 */
export function requireAdmin(handler: AuthHandler): AuthHandler {
  return requireRoles('admin', 'Admin', 'administrator')(handler);
}

// ============================================
// Helpers
// ============================================

/**
 * 현재 사용자 ID 가져오기
 */
export function getCurrentUserId(request: AuthenticatedRequest): string | null {
  return request.user?.userId || null;
}

/**
 * 사용자가 특정 역할을 가지고 있는지 확인
 */
export function hasRole(request: AuthenticatedRequest, role: string): boolean {
  return request.user?.roles?.includes(role) || false;
}

/**
 * 사용자가 관리자인지 확인
 */
export function isAdmin(request: AuthenticatedRequest): boolean {
  return hasRole(request, 'admin') || hasRole(request, 'Admin') || hasRole(request, 'administrator');
}

export default {
  initializeAuth,
  getAuthConfig,
  verifyToken,
  extractToken,
  requireAuth,
  optionalAuth,
  requireRoles,
  requireAdmin,
  getCurrentUserId,
  hasRole,
  isAdmin,
};
