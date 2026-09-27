import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/auth/login']

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const nonce = btoa(crypto.randomUUID())
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "connect-src 'self' https: wss:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
  ].join('; ')

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('Content-Security-Policy', csp)
  requestHeaders.set('x-nonce', nonce)

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  ) {
    return nextWithCsp(requestHeaders, csp)
  }

  const session = req.cookies.get('foodxpres_session')?.value

  if (pathname.startsWith('/dashboard') && !session) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return nextWithCsp(requestHeaders, csp)
}

function nextWithCsp(requestHeaders: Headers, csp: string) {
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
