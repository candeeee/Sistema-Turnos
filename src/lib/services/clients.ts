import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database.types'
import { DataError } from '@/utils/log'

export type Client = Tables<'clients'>

/**
 * Ficha del usuario de la sesión actual. RLS garantiza que solo pueda ser la
 * propia: no hace falta filtrar por user_id acá.
 */
export const getCurrentClient = cache(async (): Promise<Client | null> => {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    throw new DataError('getCurrentClient', error)
  }

  return data
})
