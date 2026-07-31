import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database.types'
import { DataError, logError } from '@/utils/log'
import { DEFAULT_MESSAGES, MESSAGE_KEYS } from '@/lib/notifications/defaults'

export type BusinessSettings = Tables<'business_settings'>

/**
 * Columnas que la aplicación necesita y la migración que las agrega.
 *
 * `select('*')` devuelve lo que la base tenga hoy, no lo que el código espera.
 * Si una migración no se aplicó, la fila llega sin esas claves y el tipo
 * generado —que las declara obligatorias— miente: TypeScript compila y el
 * error aparece recién en tiempo de ejecución, lejos de su causa.
 *
 * Esta tabla convierte ese fallo silencioso en un mensaje que dice qué falta.
 */
const COLUMNAS_POR_MIGRACION: Record<string, readonly string[]> = {
  '20260730120000_fixes.sql': ['cancellation_policy', 'reminders_enabled'],
  '20260731110000_notifications.sql': [
    'second_reminder_enabled',
    'second_reminder_hours',
    ...MESSAGE_KEYS,
  ],
}

/** Valores usados cuando la base todavía no tiene la columna. */
const RESPALDOS: Partial<BusinessSettings> = {
  cancellation_policy: '',
  reminders_enabled: true,
  second_reminder_enabled: false,
  second_reminder_hours: 2,
  ...DEFAULT_MESSAGES,
}

/**
 * Completa lo que falte y deja constancia de por qué faltaba.
 *
 * Dos situaciones distintas, tratadas distinto:
 *
 * · **La columna no existe** → la base está desactualizada. Se registra en el
 *   log con la migración exacta que hay que aplicar, y la pantalla sigue
 *   funcionando con los valores por defecto en vez de romperse.
 * · **La columna existe pero está vacía** → es un texto que nadie escribió
 *   todavía. Se completa con el valor por defecto del producto, en silencio:
 *   no es un error, es el estado inicial.
 */
function normalizeSettings(row: Record<string, unknown>): BusinessSettings {
  const faltantes: string[] = []
  const normalizada: Record<string, unknown> = { ...row }

  for (const [migracion, columnas] of Object.entries(COLUMNAS_POR_MIGRACION)) {
    for (const columna of columnas) {
      if (!(columna in row)) {
        faltantes.push(`${columna} (${migracion})`)
        normalizada[columna] = RESPALDOS[columna as keyof BusinessSettings]
      }
    }
  }

  // Plantillas presentes pero vacías: estado inicial, no error.
  for (const clave of MESSAGE_KEYS) {
    const valor = normalizada[clave]
    if (typeof valor !== 'string' || valor.trim() === '') {
      normalizada[clave] = DEFAULT_MESSAGES[clave]
    }
  }

  if (faltantes.length > 0) {
    logError(
      'getBusinessSettings:esquemaDesactualizado',
      new Error(
        `La tabla business_settings no tiene ${faltantes.length} columna(s) que el código necesita. ` +
          'La aplicación sigue funcionando con los valores por defecto, pero lo que se guarde en ' +
          'esas columnas va a fallar hasta aplicar las migraciones pendientes.',
      ),
      { faltantes },
    )
  }

  return normalizada as unknown as BusinessSettings
}

/**
 * Configuración del negocio.
 *
 * `cache` la memoiza por request: el layout, el header y el footer la piden
 * por separado y la base se consulta una sola vez.
 */
export const getBusinessSettings = cache(async (): Promise<BusinessSettings> => {
  const supabase = await createClient()
  const { data, error } = await supabase.from('business_settings').select('*').single()

  if (error || !data) {
    throw new DataError(
      'getBusinessSettings',
      error ??
        new Error(
          'La tabla business_settings no tiene su fila única. Ejecutá: insert into public.business_settings (id) values (true);',
        ),
    )
  }

  return normalizeSettings(data as unknown as Record<string, unknown>)
})

/** Link de WhatsApp listo para usar, o null si el negocio no cargó el número. */
export function whatsappLink(settings: BusinessSettings, message?: string): string | null {
  const digits = (settings.whatsapp ?? '').replace(/\D/g, '')
  if (digits.length < 8) return null

  const text = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${digits}${text}`
}
