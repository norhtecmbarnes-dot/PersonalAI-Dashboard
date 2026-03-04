import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

function cleanupStore(): void {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}

setInterval(cleanupStore, 60000);

export function rateLimit(config: RateLimitConfig) {
  const { windowMs, maxRequests, message = 'Too many requests, please try again later.' } = config;

  return async function rateLimitMiddleware(request: NextRequest): Promise<NextResponse | null> {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               'unknown';
    
    const key = `${ip}:${request.nextUrl.pathname}`;
    const now = Date.now();
    
    if (!store[key]) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return null;
    }
    
    if (now > store[key].resetTime) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return null;
    }
    
    store[key].count++;
    
    if (store[key].count > maxRequests) {
      const retryAfter = Math.ceil((store[key].resetTime - now) / 1000);
      return NextResponse.json(
        { 
          error: message,
          retryAfter,
          limit: maxRequests,
          window: Math.ceil(windowMs / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(store[key].resetTime / 1000)),
          }
        }
      );
    }
    
    return null;
  };
}

export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: RateLimitConfig
) {
  const limiter = rateLimit(config);
  
  return async (request: NextRequest): Promise<NextResponse> => {
    const rateLimitResponse = await limiter(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    return handler(request);
  };
}

export const rateLimitConfigs = {
  strict: { windowMs: 60000, maxRequests: 10 },
  normal: { windowMs: 60000, maxRequests: 60 },
  relaxed: { windowMs: 60000, maxRequests: 300 },
  ai: { windowMs: 60000, maxRequests: 30 },
};