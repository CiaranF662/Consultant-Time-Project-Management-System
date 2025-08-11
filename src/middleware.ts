import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // If a user is NOT logged in and tries to access a protected dashboard page, redirect them to login.
  if (!token && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // If a logged-in user tries to access auth pages (/login, /register), redirect them to the dashboard.
  if (token && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Allow the request to proceed.
  return NextResponse.next();
}

// Apply middleware to all relevant pages.
export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
};