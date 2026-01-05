import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ✅ PUBLIC ROUTES (NO AUTH)
  const publicPaths = [
    '/',
    '/autocityPro/login',
    '/api/health/db',
    '/api/admin/init',
    '/api/auth/login',
  ];

  const isPublicPath = publicPaths.some(
    path => pathname === path || pathname.startsWith(path)
  );

  const token = request.cookies.get('auth-token')?.value;

  // 🔐 Protect UI routes
  if (
    pathname.startsWith('/autocityPro') &&
    !isPublicPath &&
    !token
  ) {
    return NextResponse.redirect(
      new URL('/autocityPro/login', request.url)
    );
  }

  // 🔁 Prevent logged-in users from seeing login page
  if (pathname === '/autocityPro/login' && token) {
    return NextResponse.redirect(
      new URL('/autocityPro/dashboard', request.url)
    );
  }

  // 🔐 Protect API routes (except public ones)
  if (
    pathname.startsWith('/api') &&
    !isPublicPath &&
    !token
  ) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/autocityPro/:path*',
    '/api/:path*',
  ],
};
