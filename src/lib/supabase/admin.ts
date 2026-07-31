import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { publicEnv, serverEnv } from '@/lib/env'
import type { Database } from '@/types/database.types'

/**
 * Cliente con service_role: ignora por completo RLS.
 *
 * Se usa solo en tareas de mantenimiento sin sesión de usuario (expirar
 * reservas sin seña, leer la cola de recordatorios). Nunca en un flujo
 * iniciado por el navegador, y nunca en un Client Component.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(publicEnv.supabaseUrl, serverEnv.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
