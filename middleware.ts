import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Sistema simple de autenticación
// En producción, implementar autenticación real (NextAuth, Clerk, etc.)

export function middleware(request: NextRequest) {
  // Por ahora, todas las rutas están protegidas excepto la raíz
  // En una implementación real, verificarías tokens de sesión aquí
  
  // Rutas públicas (solo la página inicial)
  if (request.nextUrl.pathname === '/') {
    return NextResponse.next()
  }

  // Para desarrollo, permitir acceso a todas las rutas
  // En producción, agregar verificación de autenticación aquí
  // const token = request.cookies.get('auth-token')
  // if (!token) {
  //   return NextResponse.redirect(new URL('/', request.url))
  // }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

