'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { businessHourSchema, exceptionSchema } from '@/lib/validations/admin'
import { toFieldErrors, type ActionResult, type FormState } from '@/lib/actions/types'
import { toUserMessage } from '@/utils/errors'

function revalidateSchedule() {
  revalidatePath('/admin/horarios')
  revalidatePath('/admin/calendario')
  revalidatePath('/contacto')
  revalidatePath('/')
  revalidatePath('/reservar')
}

export async function saveBusinessHourAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = businessHourSchema.safeParse({
    weekday: formData.get('weekday'),
    opensAt: formData.get('opensAt'),
    closesAt: formData.get('closesAt'),
  })

  if (!parsed.success) {
    return { status: 'error', fieldErrors: toFieldErrors(parsed.error.issues) }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('business_hours').insert({
    weekday: parsed.data.weekday,
    opens_at: parsed.data.opensAt,
    closes_at: parsed.data.closesAt,
  })

  if (error) {
    // El trigger de la base rechaza franjas superpuestas del mismo día.
    return { status: 'error', error: toUserMessage(error, 'saveBusinessHour') }
  }

  revalidateSchedule()
  return { status: 'success', message: 'Franja agregada.' }
}

export async function deleteBusinessHourAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('business_hours').delete().eq('id', id)

  if (error) {
    return { ok: false, error: toUserMessage(error, 'deleteBusinessHour') }
  }

  revalidateSchedule()
  return { ok: true }
}

/**
 * Feriados, vacaciones y bloqueos son la misma cosa con distinta etiqueta:
 * un rango de tiempo en el que no se atiende.
 */
export async function saveExceptionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = exceptionSchema.safeParse({
    type: formData.get('type'),
    startsAt: formData.get('startsAt'),
    endsAt: formData.get('endsAt'),
    reason: formData.get('reason') ?? '',
  })

  if (!parsed.success) {
    return { status: 'error', fieldErrors: toFieldErrors(parsed.error.issues) }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('schedule_exceptions').insert({
    type: parsed.data.type,
    starts_at: new Date(parsed.data.startsAt).toISOString(),
    ends_at: new Date(parsed.data.endsAt).toISOString(),
    reason: parsed.data.reason,
  })

  if (error) {
    return { status: 'error', error: toUserMessage(error, 'saveException') }
  }

  revalidateSchedule()
  return { status: 'success', message: 'Bloqueo guardado.' }
}

export async function deleteExceptionAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('schedule_exceptions').delete().eq('id', id)

  if (error) {
    return { ok: false, error: toUserMessage(error, 'deleteException') }
  }

  revalidateSchedule()
  return { ok: true }
}
