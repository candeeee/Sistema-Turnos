import { createClient } from '@/lib/supabase/server'
import type { ClientSummary, Tables } from '@/types/domain'
import { DataError } from '@/utils/log'

export type InternalNote = Tables<'internal_notes'>

export async function listClients(search = '', limit = 100): Promise<ClientSummary[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_list_clients', {
    p_search: search,
    p_limit: limit,
    p_offset: 0,
  })

  if (error) {
    throw new DataError('listClients', error, { search })
  }

  return data ?? []
}

export async function getClient(id: string): Promise<Tables<'clients'> | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).maybeSingle()

  if (error) {
    throw new DataError('getClient', error, { id })
  }

  return data
}

/** Observaciones privadas del negocio. Nunca visibles para el cliente. */
export async function getClientNotes(clientId: string): Promise<InternalNote[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('internal_notes')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new DataError('getClientNotes', error, { clientId })
  }

  return data
}
