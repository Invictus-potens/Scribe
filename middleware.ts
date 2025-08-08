import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  // Avoid using Supabase client in Edge. Rely on presence of auth cookie.
  const hasAuthCookie = Boolean(req.cookies.get('sb-access-token') || req.cookies.get('sb:token') || req.cookies.get('supabase-auth-token'));

  // Allow access to auth callback and reset password pages
  if (req.nextUrl.pathname.startsWith('/auth/callback') || 
      req.nextUrl.pathname.startsWith('/reset-password')) {
    return response;
  }

  // Redirect to login if not authenticated and trying to access protected routes
  if (!hasAuthCookie && req.nextUrl.pathname !== '/') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}; 