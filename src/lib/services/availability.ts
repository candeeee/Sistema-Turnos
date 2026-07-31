import { createClient } from '@/lib/supabase/server'
import { addDays, type DateKey } from '@/utils/date'
import { DataError } from '@/utils/log'

export type Slot = { startsAt: string; endsAt: string }

/**
 * Horarios libres de un servicio en un día.
 *
 * El cálculo entero ocurre en la base (get_available_slots): franjas de
 * atención, feriados, vacaciones, bloqueos, turnos ya tomados, anticipación
 * mínima y ventana máxima de reserva. La aplicación solo dibuja el resultado.
 */
export async function getAvailableSlots(serviceId: string, date: DateKey): Promise<Slot[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_available_slots', {
    p_service_id: serviceId,
    p_date: date,
  })

  if (error) {
    throw new DataError('getAvailableSlots', error, { serviceId, date })
  }

  return (data ?? []).map((slot) => ({ startsAt: slot.slot_start, endsAt: slot.slot_end }))
}

/**
 * Días con al menos un horario libre dentro de un rango, para pintar el
 * calendario. Una sola consulta por mes visible.
 */
export async function getAvailableDays(
  serviceId: string,
  from: DateKey,
  to: DateKey,
): Promise<Record<DateKey, number>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_available_days', {
    p_service_id: serviceId,
    p_from: from,
    p_to: to,
  })

  if (error) {
    throw new DataError('getAvailableDays', error, { serviceId, from, to })
  }

  const days: Record<DateKey, number> = {}
  for (const row of data ?? []) {
    days[row.day] = row.slot_count
  }

  return days
}

/**
 * Primer día con lugar y sus horarios, para mostrar disponibilidad real en la
 * portada. Dos consultas: una encuentra el día, la otra trae los horarios.
 */
export async function getNextAvailability(
  serviceId: string,
  today: DateKey,
  daysAhead = 21,
): Promise<{ date: DateKey; slots: Slot[] } | null> {
  const days = await getAvailableDays(serviceId, today, addDays(today, daysAhead))
  const firstDay = Object.keys(days).sort()[0]

  if (!firstDay) return null

  return { date: firstDay, slots: await getAvailableSlots(serviceId, firstDay) }
}
