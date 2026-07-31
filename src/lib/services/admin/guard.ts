import { cache } from 'react'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/constants'

/**
 * Corta el paso a cualquiera que no sea administrador.
 *
 * Es la segunda de tres capas: el middleware ya filtró, y RLS no devolvería un
 * solo registro aunque las dos anteriores fallaran. Se repite porque el
 * middleware no debería ser nunca la única barrera de un panel.
 */
export const requireAdmin = cache(async (): Promise<void> => {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`${ROUTES.signIn}?redirect=${encodeURIComponent(ROUTES.admin)}`)
  }

  const { data: isAdmin } = await supabase.rpc('is_admin')

  if (!isAdmin) {
    redirect(ROUTES.home)
  }
})
