import { createClient } from '@/lib/supabase/server'
import type { AppointmentStatus, Tables } from '@/types/domain'
import { DataError } from '@/utils/log'

/**
 * Turno con su servicio y su cliente. Se deriva de las tablas en vez de
 * repetir los campos: si mañana una columna cambia de tipo, este alias cambia
 * con ella y el error aparece en el compilador, no en la pantalla.
 */
export type AdminAppointment = Tables<'appointments'> & {
  service: Pick<Tables<'services'>, 'id' | 'name' | 'duration_min'> | null
  client: Pick<Tables<'clients'>, 'id' | 'full_name' | 'phone' | 'email'> | null
}

/**
 * El select se declara como literal constante para que supabase-js infiera la
 * forma de la respuesta: una cadena armada dinámicamente se tipa como `string`
 * y la inferencia se cae.
 *
 * El join con `clients` es `!inner` siempre. No descarta ninguna fila porque
 * `appointments.client_id` es NOT NULL con clave foránea, y es lo que permite
 * filtrar por nombre, teléfono o email del cliente sin necesitar una segunda
 * variante del select.
 */
const SELECT =
  '*, service:services(id, name, duration_min), client:clients!inner(id, full_name, phone, email)' as const

export type AppointmentFilters = {
  status?: AppointmentStatus | 'all'
  from?: string
  to?: string
  search?: string
  serviceId?: string
}

/**
 * Listado de la tabla de turnos. Todos los filtros se aplican en la base:
 * traer todo y filtrar en memoria deja de funcionar al primer año de agenda.
 */
export async function listAppointments(
  filters: AppointmentFilters = {},
  limit = 100,
): Promise<AdminAppointment[]> {
  const supabase = await createClient()
  const search = filters.search?.trim()

  let query = supabase.from('appointments').select(SELECT)

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters.serviceId) {
    query = query.eq('service_id', filters.serviceId)
  }

  if (filters.from) {
    query = query.gte('starts_at', filters.from)
  }

  if (filters.to) {
    query = query.lte('starts_at', filters.to)
  }

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`,
      { referencedTable: 'client' },
    )
  }

  // El orden importa: `.returns()` produce un builder de transformación que ya
  // no acepta filtros, así que va al final de la cadena.
  const { data, error } = await query
    .order('starts_at', { ascending: false })
    .limit(limit)
    .returns<AdminAppointment[]>()

  if (error) {
    throw new DataError('listAppointments', error, { filters })
  }

  return data
}

/** Turnos de un rango, para el calendario. */
export async function getAppointmentsInRange(
  fromIso: string,
  toIso: string,
): Promise<AdminAppointment[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('appointments')
    .select(SELECT)
    .gte('starts_at', fromIso)
    .lt('starts_at', toIso)
    .order('starts_at')
    .returns<AdminAppointment[]>()

  if (error) {
    throw new DataError('getAppointmentsInRange', error, { fromIso, toIso })
  }

  return data
}

/** Turnos de un cliente, para su ficha. */
export async function getClientAppointments(clientId: string): Promise<AdminAppointment[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('appointments')
    .select(SELECT)
    .eq('client_id', clientId)
    .order('starts_at', { ascending: false })
    .returns<AdminAppointment[]>()

  if (error) {
    throw new DataError('getClientAppointments', error, { clientId })
  }

  return data
}
