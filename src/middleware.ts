import { NextResponse, type NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/middleware'

/** Rutas que exigen sesión iniciada, sin importar el rol. */
const PRIVATE_PREFIXES = ['/mi-cuenta', '/mis-turnos', '/reservar'] as const

/**
 * Rutas que solo tienen sentido para un cliente. El administrador no reserva
 * turnos ni tiene turnos propios: si entra, va al panel. `/mi-cuenta` queda
 * fuera a propósito, porque el perfil existe para los dos roles.
 */
const CLIENT_ONLY_PREFIXES = ['/reservar', '/mis-turnos'] as const

/** Rutas que exigen rol de administrador. */
const ADMIN_PREFIX = '/admin'

/** Rutas que no tienen sentido con la sesión ya iniciada. */
const GUEST_ONLY = ['/ingresar', '/crear-cuenta'] as const

export async function middleware(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request)
  const { pathname, search } = request.nextUrl

  const isPrivate = PRIVATE_PREFIXES.some((p) => pathname.startsWith(p))
  const isClientOnly = CLIENT_ONLY_PREFIXES.some((p) => pathname.startsWith(p))
  const isAdminRoute = pathname.startsWith(ADMIN_PREFIX)
  const isGuestOnly = GUEST_ONLY.some((p) => pathname.startsWith(p))

  if (!user && (isPrivate || isAdminRoute)) {
    const url = request.nextUrl.clone()
    url.pathname = '/ingresar'
    url.search = `?redirect=${encodeURIComponent(pathname + search)}`
    return NextResponse.redirect(url)
  }

  if (user && isGuestOnly) {
    const url = request.nextUrl.clone()
    url.pathname = '/mi-cuenta'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // El rol se resuelve una sola vez y solo cuando hace falta: en las rutas del
  // panel y en las de cliente. El resto del sitio no paga esa consulta.
  if (user && (isAdminRoute || isPrivate)) {
    const { data: isAdmin } = await supabase.rpc('is_admin')

    // El panel se verifica también acá para no renderizar nada de admin a un
    // usuario común. No es la única defensa: el layout de /admin lo vuelve a
    // comprobar y RLS bloquea los datos aunque las dos fallen.
    if (isAdminRoute && !isAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      url.search = ''
      return NextResponse.redirect(url)
    }

    // A la inversa: el administrador no reserva turnos ni tiene turnos
    // propios. Esas rutas son de cliente y lo mandan al panel.
    if (isClientOnly && isAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = ADMIN_PREFIX
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Todo menos archivos estáticos, imágenes optimizadas y el favicon:
     * refrescar la sesión en cada .png es desperdicio puro.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)',
  ],
}
