import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'

export type SessionContext = {
  isAuthenticated: boolean
  isAdmin: boolean
  displayName: string | null
}

/**
 * Contexto de sesión para la navegación.
 *
 * Usa getUser(), que valida el token contra Supabase. getSession() lee la
 * cookie sin verificarla y no sirve para decidir qué mostrar.
 */
export const getSessionContext = cache(async (): Promise<SessionContext> => {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { isAuthenticated: false, isAdmin: false, displayName: null }
  }

  const [{ data: isAdmin }, { data: client }] = await Promise.all([
    supabase.rpc('is_admin'),
    supabase.from('clients').select('full_name').eq('user_id', user.id).maybeSingle(),
  ])

  return {
    isAuthenticated: true,
    isAdmin: Boolean(isAdmin),
    displayName: client?.full_name ?? user.email ?? null,
  }
})
