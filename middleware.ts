import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ['/', '/autocityPro/login'];
  const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith('/api/auth/login'));

  // Check for auth token existence (don't verify)
  const token = request.cookies.get('auth-token')?.value;

  // If accessing protected route without token, redirect to login
  if (pathname.startsWith('/autocityPro') && !isPublicPath && !token) {
    return NextResponse.redirect(new URL('/autocityPro/login', request.url));
  }

  // If accessing login page WITH a token, redirect to dashboard
  // (Token will be verified client-side in dashboard)
  if (pathname === '/autocityPro/login' && token) {
    return NextResponse.redirect(new URL('/autocityPro/dashboard', request.url));
  }

  // For API routes, just check token exists
  if (pathname.startsWith('/api') && !pathname.startsWith('/api/auth/login')) {
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    // API route will verify the token using Node.js runtime
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/autocityPro/:path*',
    '/api/:path*',
  ],
};
