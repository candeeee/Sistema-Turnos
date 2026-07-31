'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { settingsSchema } from '@/lib/validations/admin'
import { toFieldErrors, type FormState } from '@/lib/actions/types'
import { toUserMessage } from '@/utils/errors'
import { logError } from '@/utils/log'

/**
 * Configuración del negocio.
 *
 * Cambiar el porcentaje de seña o las ventanas de reserva afecta a los turnos
 * nuevos, nunca a los ya reservados: cada turno guarda su propio snapshot.
 *
 * El UPDATE termina con `.select()` a propósito. Sin eso, si una policy de RLS
 * bloquea la operación, PostgREST no devuelve error: informa cero filas
 * afectadas y la acción respondería "guardado" sin haber guardado nada. Es el
 * modo de fallo más peligroso que tiene este patrón, porque es silencioso.
 */
export async function updateSettingsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = Object.fromEntries(formData)
  const parsed = settingsSchema.safeParse(raw)

  if (!parsed.success) {
    logError('updateSettings:validacion', parsed.error, {
      issues: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    })
    return { status: 'error', fieldErrors: toFieldErrors(parsed.error.issues) }
  }

  const data = parsed.data
  const supabase = await createClient()

  const { data: updated, error } = await supabase
    .from('business_settings')
    .update({
      name: data.name,
      phone: data.phone,
      whatsapp: data.whatsapp,
      email: data.email,
      address: data.address,
      maps_url: data.mapsUrl || null,
      instagram: data.instagram,
      facebook: data.facebook,
      timezone: data.timezone,
      slot_interval_min: data.slotIntervalMin,
      min_hours_before_booking: data.minHoursBeforeBooking,
      max_days_ahead: data.maxDaysAhead,
      min_hours_before_cancel: data.minHoursBeforeCancel,
      hold_hours: data.holdHours,
      reminder_hours_before: data.reminderHoursBefore,
      reminders_enabled: data.remindersEnabled,
      deposit_percentage: data.depositPercentage,
      deposit_alias: data.depositAlias,
      deposit_cbu: data.depositCbu,
      deposit_instructions: data.depositInstructions,
      booking_notice: data.bookingNotice,
      cancellation_policy: data.cancellationPolicy,
    })
    .eq('id', true)
    .select('id')
    .maybeSingle()

  if (error) {
    return { status: 'error', error: toUserMessage(error, 'updateSettings', { timezone: data.timezone }) }
  }

  if (!updated) {
    logError(
      'updateSettings:sinFilas',
      new Error('El UPDATE no afectó ninguna fila.'),
      { hint: 'Falta la fila de business_settings o la policy business_settings_update_admin no te reconoce como administrador.' },
    )
    return {
      status: 'error',
      error:
        'No se guardó ningún cambio: la base no reconoce tu sesión como administrador o falta la fila de configuración. Revisá /admin/diagnostico.',
    }
  }

  // La configuración se lee en todo el sitio: se revalida el layout entero.
  revalidatePath('/', 'layout')
  return { status: 'success', message: 'Configuración guardada.' }
}
