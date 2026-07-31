import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import { publicEnv } from '@/lib/env'
import type { Database } from '@/types/database.types'

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 *
 * Respeta RLS: actúa con la identidad del usuario de la sesión. Es el cliente
 * por defecto de todo el proyecto.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Los Server Components no pueden escribir cookies. La sesión ya se
          // refrescó en el middleware, así que este caso es inofensivo.
        }
      },
    },
  })
}
