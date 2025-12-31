/**
 * Microsoft Entra ID (Azure AD) JWT Token Verification Middleware
 */

import { HttpRequest, InvocationContext } from '@azure/functions';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';

interface JwtPayload {
  oid: string; // Azure AD Object ID
  sub: string;
  email?: string;
  preferred_username?: string;
  name?: string;
  tid?: string; // Tenant ID
}

// JWKS Client 설정 (External ID와 Entra ID 모두 지원)
const tenantId = process.env.ENTRA_TENANT_ID;
const tenantName = process.env.ENTRA_TENANT_NAME;

// External ID를 사용하는 경우 ciamlogin.com 사용, 그렇지 않으면 일반 Entra ID
const jwksUri = tenantName
  ? `https://${tenantName}.ciamlogin.com/${tenantName}.onmicrosoft.com/discovery/v2.0/keys`
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

    // External ID issuer (if tenant name is provided)
    if (tenantName) {
      validIssuers.push(
        `https://${tenantName}.ciamlogin.com/${tenantId}/v2.0` // External ID v2.0
      );
    }

    // Standard Entra ID issuers (fallback)
    if (tenantId) {
      validIssuers.push(
        `https://sts.windows.net/${tenantId}/`, // v1.0 format
        `https://login.microsoftonline.com/${tenantId}/v2.0` // v2.0 format
      );
    }

    // External ID와 표준 Entra ID audience 모두 지원
    const validAudiences: string[] = [clientId];
    if (tenantName) {
      validAudiences.push(`https://${tenantName}.onmicrosoft.com/api`);
    } else {
      validAudiences.push(`api://${clientId}`);
    }

    jwt.verify(
      token,
      getKey,
      {
        audience: validAudiences,
        issuer: validIssuers,
        algorithms: ['RS256'],
      },
      (err: any, decoded: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded as JwtPayload);
        }
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
