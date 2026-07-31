import type { PostgrestError } from '@supabase/supabase-js'

import { ERROR_CODES, logError } from '@/utils/log'

/**
 * Los RPC de la base lanzan mensajes ya redactados para el usuario final
 * ("Ese horario ya no está disponible"). Estos son los códigos que usan y que
 * pueden mostrarse tal cual.
 *
 * Cualquier otro error es un problema interno: se registra completo en el
 * servidor con `logError` y al usuario se le devuelve un mensaje entendible
 * que incluye el código, para que pueda pasarlo a soporte sin adivinar.
 */
const USER_FACING_CODES = new Set([
  '23P01', // horario ocupado o solapado
  '23514', // regla de negocio incumplida
  '42501', // sin permisos (la base explica cuál)
  '54000', // límite alcanzado
  'P0002', // no encontrado
])

export function toUserMessage(
  error: PostgrestError | null,
  action: string,
  payload?: Record<string, unknown>,
): string {
  if (!error) {
    return 'No pudimos completar la operación. Probá de nuevo en unos minutos.'
  }

  logError(action, error, payload)

  if (error.code && USER_FACING_CODES.has(error.code) && error.message) {
    return error.message
  }

  const explicacion = error.code ? ERROR_CODES[error.code] : undefined

  return explicacion
    ? `No pudimos completar la operación (${error.code}): ${explicacion}`
    : `No pudimos completar la operación${error.code ? ` (${error.code})` : ''}. Revisá la consola del servidor para ver el detalle.`
}
