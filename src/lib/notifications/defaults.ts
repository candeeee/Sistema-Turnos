/**
 * Textos por defecto de los mensajes.
 *
 * No son datos de ejemplo: son los valores con los que arranca el producto,
 * editables desde /admin/notificaciones. Existen en dos lugares a propósito:
 *
 *   · Acá, como red de seguridad en tiempo de ejecución.
 *   · En `20260731120000_message_defaults.sql`, como DEFAULT de la columna,
 *     para que cualquier instalación nueva los tenga desde el primer día sin
 *     que nadie los cargue a mano.
 *
 * Si se cambia un texto, hay que cambiarlo en los dos lugares. Es la única
 * duplicación aceptada del proyecto: la alternativa —que la aplicación
 * dependa de que la base esté al día— es exactamente lo que provocó el error
 * de plantillas indefinidas.
 */
export const DEFAULT_MESSAGES = {
  message_confirmation:
    '¡Hola {cliente}! Confirmamos tu turno de {servicio} para el {fecha} a las {hora}. Te esperamos en {negocio}.',
  message_reminder:
    '¡Hola {cliente}! Te recordamos tu turno de {servicio} el {fecha} a las {hora}. Si no podés venir, avisanos así liberamos el lugar.',
  message_cancellation:
    'Hola {cliente}, cancelamos tu turno de {servicio} del {fecha} a las {hora}. Escribinos cuando quieras y coordinamos uno nuevo.',
  message_status_change:
    'Hola {cliente}, tu turno de {servicio} del {fecha} a las {hora} pasó a: {estado}.',
} as const

export type MessageKey = keyof typeof DEFAULT_MESSAGES

export const MESSAGE_KEYS = Object.keys(DEFAULT_MESSAGES) as MessageKey[]
