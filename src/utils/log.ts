import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Registro estructurado de errores.
 *
 * Un `console.error(error)` sobre un error de Supabase imprime `{}`: los
 * campos que importan (`code`, `details`, `hint`) no son enumerables y se
 * pierden. Ese fue exactamente el caso de `[getDashboardStats] {}`, donde el
 * error real era un PGRST202 —función inexistente— y no se veía por ningún
 * lado.
 *
 * Esta función extrae siempre los mismos campos, así que cualquier error del
 * sistema se lee igual en la terminal y se puede buscar por `action`.
 */

export type ErrorShape = {
  message: string
  code?: string
  details?: string
  hint?: string
  stack?: string
}

/** Códigos de PostgREST y PostgreSQL que aparecen seguido en este proyecto. */
export const ERROR_CODES: Record<string, string> = {
  INVALID_API_KEY:
    'Supabase rechazó la clave. Revisá que la URL y la clave sean del MISMO proyecto, que la clave esté en una sola línea sin comillas, y que el tipo de clave que usás siga habilitado en Project Settings → API Keys. Después reiniciá npm run dev.',
  PGRST202: 'La función RPC no existe en la base o su firma no coincide. Faltan migraciones.',
  PGRST204: 'La columna enviada no existe en la tabla. Los tipos están desactualizados.',
  PGRST116: 'La consulta esperaba exactamente una fila y encontró cero.',
  '42501': 'Permiso denegado: falta un GRANT o la policy de RLS bloquea la operación.',
  '42883': 'La función no existe con esos tipos de argumentos.',
  '23P01': 'El rango se superpone con otro registro (constraint de exclusión).',
  '23503': 'Hay registros relacionados que impiden la operación.',
  '23505': 'Ya existe un registro con ese valor único.',
  '23514': 'Una regla de negocio de la base rechazó el cambio.',
  '22023': 'Un valor enviado no es válido para su tipo.',
  '54000': 'Se alcanzó un límite configurado en la base.',
  P0002: 'No se encontró el registro buscado.',
}

export function describeError(error: unknown): ErrorShape {
  if (!error) return { message: 'Error desconocido (sin objeto de error).' }

  const pg = error as Partial<PostgrestError> & { stack?: string; message?: string }
  const message = pg.message ?? String(error)

  // Supabase no devuelve `code` para los errores de autenticación de la API:
  // llegan solo como mensaje. Se les asigna uno propio para poder explicarlos
  // igual que a los de PostgreSQL.
  const code = pg.code ?? (/invalid api key/i.test(message) ? 'INVALID_API_KEY' : undefined)

  return {
    message,
    code,
    details: pg.details ?? undefined,
    hint: pg.hint ?? undefined,
    stack: pg.stack,
  }
}

export function logError(
  action: string,
  error: unknown,
  payload?: Record<string, unknown>,
): ErrorShape {
  const shape = describeError(error)
  const explicacion = shape.code ? ERROR_CODES[shape.code] : undefined

  // El primer argumento va como texto a propósito: el overlay de Next.js
  // muestra un objeto suelto como `{}` y el mensaje se pierde justo cuando
  // más hace falta.
  console.error(
    `\n✖ [${action}] ${shape.message}${shape.code ? ` (${shape.code})` : ''}` +
      (explicacion ? `\n  → ${explicacion}` : ''),
    {
      action,
      payload,
      message: shape.message,
      code: shape.code,
      details: shape.details,
      hint: shape.hint,
      explicacion,
      stack: shape.stack,
      at: new Date().toISOString(),
    },
  )

  return shape
}

/**
 * Error de acceso a datos.
 *
 * Se lanza en lugar de devolver un valor vacío: una pantalla en cero por un
 * fallo de base es peor que una pantalla que dice qué se rompió. Los límites
 * de error de cada ruta lo capturan y lo muestran.
 */
export class DataError extends Error {
  readonly action: string
  readonly code: string | undefined
  readonly details: string | undefined
  readonly hint: string | undefined

  constructor(action: string, error: unknown, payload?: Record<string, unknown>) {
    const shape = logError(action, error, payload)

    super(
      shape.code && ERROR_CODES[shape.code]
        ? `${shape.message}\n\n${ERROR_CODES[shape.code]}`
        : shape.message,
    )

    this.name = 'DataError'
    this.action = action
    this.code = shape.code
    this.details = shape.details
    this.hint = shape.hint
  }
}
