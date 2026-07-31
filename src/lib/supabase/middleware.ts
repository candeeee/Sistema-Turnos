import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { publicEnv } from '@/lib/env'
import type { Database } from '@/types/database.types'

/**
 * Refresca el token de la sesión y devuelve el usuario junto con la respuesta
 * que ya tiene las cookies actualizadas. Sin esto, la sesión expira en el
 * medio de la navegación y el usuario se encuentra deslogueado sin motivo.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  // getUser() valida el token contra Supabase. getSession() lee la cookie sin
  // verificarla: no sirve para decidir permisos.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response, supabase, user }
}
