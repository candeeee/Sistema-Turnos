import { createClient } from '@/lib/supabase/server'
import type { AppointmentStatus, Tables } from '@/types/domain'
import { ACTIVE_STATUSES } from '@/lib/constants'
import { DataError } from '@/utils/log'

export type AppointmentWithService = Tables<'appointments'> & {
  service: Pick<Tables<'services'>, 'id' | 'name' | 'slug' | 'image_path'> | null
}

const SELECT_WITH_SERVICE = '*, service:services(id, name, slug, image_path)' as const

/**
 * Turnos del usuario de la sesión. RLS limita el resultado a los propios, así
 * que no hace falta ningún filtro por cliente.
 */
export async function getMyUpcomingAppointments(): Promise<AppointmentWithService[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('appointments')
    .select(SELECT_WITH_SERVICE)
    .in('status', ACTIVE_STATUSES)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at')

  if (error) {
    throw new DataError('getMyUpcomingAppointments', error)
  }

  return data
}

/** Todo lo que ya pasó o quedó cerrado, del más reciente al más viejo. */
export async function getMyPastAppointments(limit = 50): Promise<AppointmentWithService[]> {
  const supabase = await createClient()
  const closed: AppointmentStatus[] = [
    'completed',
    'cancelled_by_client',
    'cancelled_by_business',
    'rescheduled',
    'no_show',
  ]

  const { data, error } = await supabase
    .from('appointments')
    .select(SELECT_WITH_SERVICE)
    .or(`status.in.(${closed.join(',')}),starts_at.lt.${new Date().toISOString()}`)
    .order('starts_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new DataError('getMyPastAppointments', error)
  }

  return data
}

export async function getMyAppointment(id: string): Promise<AppointmentWithService | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('appointments')
    .select(SELECT_WITH_SERVICE)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new DataError('getMyAppointment', error, { id })
  }

  return data
}
