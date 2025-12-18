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

// JWKS Client 설정 (Microsoft Entra ID)
const client = new jwksClient.JwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.ENTRA_TENANT_ID}/discovery/v2.0/keys`,
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
 */
export async function verifyToken(token: string): Promise<JwtPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        audience: process.env.ENTRA_CLIENT_ID,
        issuer: `https://login.microsoftonline.com/${process.env.ENTRA_TENANT_ID}/v2.0`,
        algorithms: ['RS256'],
      },
      (err, decoded) => {
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
