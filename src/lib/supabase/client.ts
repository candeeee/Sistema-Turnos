'use client'

import { createBrowserClient } from '@supabase/ssr'

import { publicEnv } from '@/lib/env'
import type { Database } from '@/types/database.types'

/**
 * Cliente de Supabase para Client Components.
 *
 * Se usa únicamente para lo que necesita el navegador: iniciar sesión,
 * suscripciones en tiempo real y subida de archivos a Storage. Las lecturas
 * de datos van por Server Components y las escrituras por Server Actions.
 */
export function createClient() {
  return createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseKey)
}
