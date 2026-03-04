import { NextRequest, NextResponse } from 'next/server';
import { login, logout, initializeDefaultUser, getCurrentUser, isAuthEnabled } from '@/lib/middleware/auth';

export async function POST(request: NextRequest) {
  try {
    if (!isAuthEnabled()) {
      return NextResponse.json({
        success: true,
        message: 'Authentication is disabled. Set ENABLE_AUTH=true to enable.',
        authenticated: true,
        user: { username: 'local', role: 'admin' },
        authEnabled: false,
      });
    }
    
    const body = await request.json();
    const { action, username, password, token } = body;
    
    initializeDefaultUser();
    
    if (action === 'login') {
      if (!username || !password) {
        return NextResponse.json(
          { error: 'Username and password required' },
          { status: 400 }
        );
      }
      
      const result = await login(username, password);
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 401 }
        );
      }
      
      const response = NextResponse.json({
        success: true,
        user: result.user,
      });
      
      response.cookies.set('auth_token', result.token!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 86400,
      });
      
      return response;
    }
    
    if (action === 'logout') {
      const authToken = request.cookies.get('auth_token')?.value;
      if (authToken) {
        logout(authToken);
      }
      
      const response = NextResponse.json({ success: true });
      response.cookies.delete('auth_token');
      return response;
    }
    
    if (action === 'status') {
      const user = getCurrentUser(request);
      
      if (!user) {
        return NextResponse.json({
          authenticated: false,
          user: null,
        });
      }
      
      return NextResponse.json({
        authenticated: true,
        user: {
          username: user.username,
          role: user.role,
        },
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Use: login, logout, or status' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Auth API error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthEnabled()) {
    return NextResponse.json({
      authenticated: true,
      user: { username: 'local', role: 'admin' },
      authEnabled: false,
    });
  }
  
  initializeDefaultUser();
  
  const user = getCurrentUser(request);
  
  if (!user) {
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }
  
  return NextResponse.json({
    authenticated: true,
    user: {
      username: user.username,
      role: user.role,
    },
  });
}