import { NextRequest, NextResponse } from 'next/server'

// Rutas que SÍ o SÍ requieren login
const PROTECTED_PATHS = ['/checkout', '/mis-pedidos', '/perfil']

// Rutas que NO deben requerir login
const PUBLIC_PATHS = ['/login', '/registro']

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

  // Ignorar assets y API pública
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/auth') ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  ) {
    return nextWithCsp(requestHeaders, csp)
  }

  // Verificar cookie
  const session = req.cookies.get('foodxpres_client')?.value

  // Si es ruta protegida y no hay sesión → redirigir a login con redirect
  if (PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    if (!session) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
  }

  return nextWithCsp(requestHeaders, csp)
}

function nextWithCsp(requestHeaders: Headers, csp: string) {
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
