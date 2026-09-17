import { NextRequest, NextResponse } from 'next/server'

// Rutas que SÍ o SÍ requieren login
const PROTECTED_PATHS = ['/checkout', '/mis-pedidos', '/perfil']

// Rutas que NO deben requerir login
const PUBLIC_PATHS = ['/login', '/registro']

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Ignorar assets y API pública
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/auth') ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  ) {
    return NextResponse.next()
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

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}