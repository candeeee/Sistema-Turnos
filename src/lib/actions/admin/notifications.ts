'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { notificationsSchema } from '@/lib/validations/admin'
import { toFieldErrors, type FormState } from '@/lib/actions/types'
import { toUserMessage } from '@/utils/errors'
import { logError } from '@/utils/log'
import { ROUTES } from '@/lib/constants'

/**
 * Configuración de recordatorios y mensajes.
 *
 * Guardar acá reencola los recordatorios pendientes: el trigger
 * `appointments_sync_reminder` recalcula el momento de envío cuando cambia el
 * turno, pero no cuando cambia la configuración. Por eso, después del UPDATE,
 * se tocan los turnos futuros activos para que el trigger vuelva a correr con
 * los valores nuevos. Sin esto, cambiar "24 horas antes" por "6 horas antes"
 * solo afectaría a los turnos que se reserven después.
 */
export async function updateNotificationsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = notificationsSchema.safeParse(Object.fromEntries(formData))

  if (!parsed.success) {
    logError('updateNotifications:validacion', parsed.error, {
      issues: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    })
    return { status: 'error', fieldErrors: toFieldErrors(parsed.error.issues) }
  }

  const data = parsed.data
  const supabase = await createClient()

  const { data: updated, error } = await supabase
    .from('business_settings')
    .update({
      reminders_enabled: data.remindersEnabled,
      reminder_hours_before: data.reminderHoursBefore,
      second_reminder_enabled: data.secondReminderEnabled,
      second_reminder_hours: data.secondReminderHours,
      message_reminder: data.messageReminder,
      message_confirmation: data.messageConfirmation,
      message_cancellation: data.messageCancellation,
      message_status_change: data.messageStatusChange,
    })
    .eq('id', true)
    .select('id')
    .maybeSingle()

  if (error) {
    return { status: 'error', error: toUserMessage(error, 'updateNotifications') }
  }

  if (!updated) {
    return {
      status: 'error',
      error:
        'No se guardó ningún cambio: la base no reconoce tu sesión como administradora. Revisá /admin/diagnostico.',
    }
  }

  // Reencolar: se reescribe `starts_at` con su propio valor para que el
  // trigger recalcule la cola con la configuración nueva.
  const { data: futuros, error: readError } = await supabase
    .from('appointments')
    .select('id, starts_at')
    .gt('starts_at', new Date().toISOString())
    .in('status', ['pending_confirmation', 'confirmed'])

  if (readError) {
    logError('updateNotifications:reencolar', readError)
  } else {
    for (const turno of futuros ?? []) {
      const { error: touchError } = await supabase
        .from('appointments')
        .update({ starts_at: turno.starts_at })
        .eq('id', turno.id)

      if (touchError) logError('updateNotifications:reencolar', touchError, { id: turno.id })
    }
  }

  revalidatePath(ROUTES.adminNotifications)
  revalidatePath('/', 'layout')

  return {
    status: 'success',
    message: `Notificaciones guardadas. Se reencolaron ${futuros?.length ?? 0} turnos futuros.`,
  }
}
