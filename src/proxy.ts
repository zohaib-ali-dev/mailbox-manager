import { NextResponse, type NextRequest } from 'next/server';

/** Request header carrying the path being rendered, so server layouts can build `?next=`. */
export const PATH_HEADER = 'x-mm-path';

/**
 * Forwards the requested path to server components. It does NOT protect anything: route
 * protection lives in the server layouts and pages, which re-check the session on every render.
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(PATH_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
