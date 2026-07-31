import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database.types'
import { DataError } from '@/utils/log'

/** Todos los servicios, incluidos los desactivados: es la vista del panel. */
export async function listAllServices(): Promise<Tables<'services'>[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('sort_order')
    .order('name')

  if (error) {
    throw new DataError('listAllServices', error)
  }

  return data
}
