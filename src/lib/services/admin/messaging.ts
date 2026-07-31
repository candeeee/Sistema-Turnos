import type { BusinessSettings } from '@/lib/services/settings'
import type { Messaging } from '@/components/admin/AppointmentsTable'
import { DEFAULT_MESSAGES } from '@/lib/notifications/defaults'

/**
 * Traduce la configuración del negocio al objeto que consume la tabla de
 * turnos. Existe para que las pantallas que muestran turnos no repitan el
 * mismo mapeo y no se desincronicen cuando se agregue una plantilla.
 *
 * `getBusinessSettings()` ya garantiza que las plantillas vengan completas.
 * El respaldo se repite acá porque esta función es pública y podría recibir
 * una configuración obtenida por otra vía: una plantilla vacía produce un
 * link de WhatsApp con un mensaje en blanco, que es peor que no ofrecerlo.
 */
function conRespaldo(valor: string | null | undefined, respaldo: string): string {
  return typeof valor === 'string' && valor.trim() !== '' ? valor : respaldo
}

export function toMessaging(settings: BusinessSettings): Messaging {
  return {
    businessName: settings.name ?? '',
    alias: settings.deposit_alias ?? '',
    confirmation: conRespaldo(settings.message_confirmation, DEFAULT_MESSAGES.message_confirmation),
    reminder: conRespaldo(settings.message_reminder, DEFAULT_MESSAGES.message_reminder),
    cancellation: conRespaldo(settings.message_cancellation, DEFAULT_MESSAGES.message_cancellation),
    statusChange: conRespaldo(
      settings.message_status_change,
      DEFAULT_MESSAGES.message_status_change,
    ),
  }
}
