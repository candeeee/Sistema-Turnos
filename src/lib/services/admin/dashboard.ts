import { createClient } from '@/lib/supabase/server'
import { DataError } from '@/utils/log'
import type { DashboardStats } from '@/types/database.types'

/**
 * Todas las métricas del dashboard en una sola consulta.
 *
 * Antes esta función devolvía ceros cuando la RPC fallaba, y el panel mostraba
 * un dashboard vacío sin decir nada: así se ocultó durante toda la instalación
 * que `admin_dashboard_stats()` no existía en la base. Ahora el error sube y
 * el límite de error de la ruta lo muestra con su código.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_dashboard_stats')

  if (error) {
    throw new DataError('getDashboardStats', error, { rpc: 'admin_dashboard_stats' })
  }

  if (!data) {
    throw new DataError(
      'getDashboardStats',
      new Error('admin_dashboard_stats() devolvió null. Revisá que exista la fila de business_settings.'),
    )
  }

  return data
}
