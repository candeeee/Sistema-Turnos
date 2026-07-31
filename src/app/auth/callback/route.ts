import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/constants'

/**
 * Destino de los links de confirmación de email y de recuperación de
 * contraseña que envía Supabase. Cambia el código de un solo uso por una
 * sesión y manda al usuario a donde corresponde.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next')
  const safeNext = next?.startsWith('/') ? next : null

  if (!code) {
    return NextResponse.redirect(`${origin}${ROUTES.signIn}?error=link-invalido`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}${ROUTES.signIn}?error=link-vencido`)
  }

  const { data: isAdmin } = await supabase.rpc('is_admin')

  return NextResponse.redirect(
    `${origin}${safeNext ?? (isAdmin ? ROUTES.admin : ROUTES.appointments)}`,
  )
}
