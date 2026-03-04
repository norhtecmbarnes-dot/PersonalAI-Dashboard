import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  createdAt: number;
}

interface Session {
  userId: string;
  token: string;
  expires: number;
  createdAt: number;
}

interface AuthConfig {
  requireAuth?: boolean;
  roles?: ('admin' | 'user')[];
}

const sessions = new Map<string, Session>();
const users = new Map<string, { id: string; username: string; passwordHash: string; role: 'admin' | 'user'; createdAt: number }>();

const AUTH_COOKIE = 'auth_token';
const AUTH_HEADER = 'authorization';
const TOKEN_LENGTH = 64;
const SESSION_DURATION = 86400000; // 24 hours

export function isAuthEnabled(): boolean {
  return process.env.ENABLE_AUTH === 'true';
}

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, s, 100000, 64, 'sha512').toString('hex');
  return { hash, salt: s };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const result = hashPassword(password, salt);
  return result.hash === hash;
}

function generateToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

function cleanupSessions(): void {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (session.expires < now) {
      sessions.delete(token);
    }
  }
}

setInterval(cleanupSessions, 60000);

export function initializeDefaultUser(): void {
  if (users.size === 0) {
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
    const userPassword = process.env.DEFAULT_USER_PASSWORD;
    
    if (!adminPassword) {
      console.warn('[Auth] WARNING: DEFAULT_ADMIN_PASSWORD not set. Admin login disabled.');
      console.warn('[Auth] Set DEFAULT_ADMIN_PASSWORD environment variable to enable admin login.');
      return;
    }
    
    if (adminPassword.length < 12) {
      console.warn('[Auth] WARNING: DEFAULT_ADMIN_PASSWORD is too short. Use at least 12 characters.');
    }
    
    const { hash, salt } = hashPassword(adminPassword);
    
    users.set('admin', {
      id: 'admin-001',
      username: 'admin',
      passwordHash: `${hash}:${salt}`,
      role: 'admin',
      createdAt: Date.now(),
    });
    
    if (userPassword && userPassword.length >= 8) {
      const { hash: hash2, salt: salt2 } = hashPassword(userPassword);
      users.set('user', {
        id: 'user-001',
        username: 'user',
        passwordHash: `${hash2}:${salt2}`,
        role: 'user',
        createdAt: Date.now(),
      });
    }
    
    console.log('[Auth] Default users initialized. Admin user ready.');
  }
}

export async function login(username: string, password: string): Promise<{ success: boolean; token?: string; error?: string; user?: Omit<User, 'id'> }> {
  const user = users.get(username);
  
  if (!user) {
    return { success: false, error: 'Invalid credentials' };
  }
  
  const [hash, salt] = user.passwordHash.split(':');
  
  if (!verifyPassword(password, hash, salt)) {
    return { success: false, error: 'Invalid credentials' };
  }
  
  const token = generateToken();
  sessions.set(token, {
    userId: user.id,
    token,
    expires: Date.now() + SESSION_DURATION,
    createdAt: Date.now(),
  });
  
  return {
    success: true,
    token,
    user: {
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
    },
  };
}

export function logout(token: string): boolean {
  return sessions.delete(token);
}

export function validateToken(token: string): User | null {
  const session = sessions.get(token);
  
  if (!session) {
    return null;
  }
  
  if (session.expires < Date.now()) {
    sessions.delete(token);
    return null;
  }
  
  for (const user of users.values()) {
    if (user.id === session.userId) {
      return {
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      };
    }
  }
  
  return null;
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get(AUTH_HEADER);
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  const cookie = request.cookies.get(AUTH_COOKIE);
  if (cookie) {
    return cookie.value;
  }
  
  return null;
}

export function getCurrentUser(request: NextRequest): User | null {
  if (!isAuthEnabled()) {
    return { id: 'default', username: 'local', role: 'admin', createdAt: Date.now() };
  }
  
  const token = getTokenFromRequest(request);
  if (!token) {
    return null;
  }
  
  return validateToken(token);
}

export function withAuth(
  handler: (request: NextRequest, user: User) => Promise<NextResponse>,
  config: AuthConfig = {}
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    if (!isAuthEnabled()) {
      return handler(request, { id: 'default', username: 'local', role: 'admin', createdAt: Date.now() });
    }
    
    const user = getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', authEnabled: true },
        { status: 401 }
      );
    }
    
    if (config.roles && !config.roles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    return handler(request, user);
  };
}

export function optionalAuth(
  handler: (request: NextRequest, user: User | null) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    const user = getCurrentUser(request);
    return handler(request, user);
  };
}

initializeDefaultUser();