'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { getAvailableDays, getAvailableSlots, type Slot } from '@/lib/services/availability'
import { bookingSchema, cancelSchema, dateKeySchema, rescheduleSchema } from '@/lib/validations/booking'
import { toFieldErrors, type ActionResult, type FormState } from '@/lib/actions/types'
import { toUserMessage } from '@/utils/errors'
import { ROUTES } from '@/lib/constants'
import type { DateKey } from '@/utils/date'

export type BookingState = FormState & { appointmentId?: string }

/* -------------------------------------------------------------------------
 * Lecturas para el flujo de reserva
 * ---------------------------------------------------------------------- */

/**
 * Las llama el selector de horarios a medida que el usuario navega. Son
 * Server Actions y no Route Handlers porque no necesitan URL propia ni
 * caché HTTP: la disponibilidad cambia segundo a segundo.
 */
export async function fetchSlotsAction(serviceId: string, date: DateKey): Promise<Slot[]> {
  const parsed = dateKeySchema.safeParse(date)
  if (!parsed.success) return []

  return getAvailableSlots(serviceId, parsed.data)
}

export async function fetchAvailableDaysAction(
  serviceId: string,
  from: DateKey,
  to: DateKey,
): Promise<Record<DateKey, number>> {
  const fromParsed = dateKeySchema.safeParse(from)
  const toParsed = dateKeySchema.safeParse(to)
  if (!fromParsed.success || !toParsed.success) return {}

  return getAvailableDays(serviceId, fromParsed.data, toParsed.data)
}

/* -------------------------------------------------------------------------
 * Escrituras
 * ---------------------------------------------------------------------- */

/**
 * Reservar.
 *
 * Esta acción no decide nada: delega en el RPC book_appointment(), que
 * revalida servicio, horario, anticipación, límites y solapamiento dentro de
 * una única transacción. Validar acá y confiar sería suficiente para un
 * usuario normal, pero no para alguien que llame al endpoint a mano.
 */
export async function bookAppointmentAction(
  _prev: BookingState,
  formData: FormData,
): Promise<BookingState> {
  const parsed = bookingSchema.safeParse({
    serviceId: formData.get('serviceId'),
    startsAt: formData.get('startsAt'),
    notes: formData.get('notes') ?? '',
    depositAccepted: formData.get('depositAccepted'),
  })

  if (!parsed.success) {
    return { status: 'error', fieldErrors: toFieldErrors(parsed.error.issues) }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('book_appointment', {
    p_service_id: parsed.data.serviceId,
    p_starts_at: parsed.data.startsAt,
    p_client_notes: parsed.data.notes,
  })

  if (error) {
    return { status: 'error', error: toUserMessage(error, 'bookAppointment') }
  }

  revalidatePath(ROUTES.appointments)
  revalidatePath(ROUTES.book)

  return { status: 'success', appointmentId: data }
}

export async function cancelAppointmentAction(
  appointmentId: string,
  reason = '',
): Promise<ActionResult> {
  const parsed = cancelSchema.safeParse({ appointmentId, reason })

  if (!parsed.success) {
    return { ok: false, error: 'No pudimos identificar ese turno.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('cancel_appointment', {
    p_appointment_id: parsed.data.appointmentId,
    p_reason: parsed.data.reason,
  })

  if (error) {
    return { ok: false, error: toUserMessage(error, 'cancelAppointment') }
  }

  revalidatePath(ROUTES.appointments)
  return { ok: true }
}

export async function rescheduleAppointmentAction(
  appointmentId: string,
  startsAt: string,
): Promise<ActionResult & { appointmentId?: string }> {
  const parsed = rescheduleSchema.safeParse({ appointmentId, startsAt })

  if (!parsed.success) {
    return { ok: false, error: 'Los datos de la reprogramación no son válidos.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('reschedule_appointment', {
    p_appointment_id: parsed.data.appointmentId,
    p_new_starts_at: parsed.data.startsAt,
  })

  if (error) {
    return { ok: false, error: toUserMessage(error, 'rescheduleAppointment') }
  }

  revalidatePath(ROUTES.appointments)
  return { ok: true, appointmentId: data }
}
