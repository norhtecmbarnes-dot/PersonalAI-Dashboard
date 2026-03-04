import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = 'csrf_token';

interface CSRFToken {
  token: string;
  expires: number;
}

const tokenStore = new Map<string, CSRFToken>();

function cleanupTokens(): void {
  const now = Date.now();
  for (const [key, token] of tokenStore.entries()) {
    if (token.expires < now) {
      tokenStore.delete(key);
    }
  }
}

setInterval(cleanupTokens, 300000);

export function generateCSRFToken(): { token: string; expires: number } {
  const token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  const expires = Date.now() + 3600000;
  
  const sessionToken = crypto.randomBytes(16).toString('hex');
  tokenStore.set(sessionToken, { token, expires });
  
  return { token: sessionToken + ':' + token, expires };
}

export function validateCSRFToken(request: NextRequest): boolean {
  const headerToken = request.headers.get(CSRF_HEADER);
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;
  
  if (!headerToken) {
    return false;
  }
  
  const [sessionId, token] = headerToken.split(':');
  if (!sessionId || !token) {
    return false;
  }
  
  const stored = tokenStore.get(sessionId);
  if (!stored) {
    return false;
  }
  
  if (stored.expires < Date.now()) {
    tokenStore.delete(sessionId);
    return false;
  }
  
  if (stored.token !== token) {
    return false;
  }
  
  return true;
}

export function csrfProtection() {
  return async function csrfMiddleware(request: NextRequest): Promise<NextResponse | null> {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return null;
    }
    
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      return null;
    }
    
    if (!validateCSRFToken(request)) {
      return NextResponse.json(
        { error: 'CSRF token validation failed' },
        { status: 403 }
      );
    }
    
    return null;
  };
}

export function withCSRF(
  handler: (request: NextRequest) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  const csrf = csrfProtection();
  
  return async (request: NextRequest): Promise<NextResponse> => {
    const csrfResponse = await csrf(request);
    if (csrfResponse) {
      return csrfResponse;
    }
    return handler(request);
  };
}

export function getCSRFTokenHandler(request: NextRequest): NextResponse {
  const { token, expires } = generateCSRFToken();
  
  const response = NextResponse.json({ 
    success: true, 
    token,
    expires 
  });
  
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(expires),
  });
  
  return response;
}