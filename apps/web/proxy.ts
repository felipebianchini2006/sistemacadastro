import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const isPublicPath = (pathname: string) =>
  pathname.startsWith('/admin/login') ||
  pathname.startsWith('/_next') ||
  pathname.startsWith('/favicon') ||
  pathname.startsWith('/images') ||
  pathname.endsWith('.ico');

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get('admin_access')?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
