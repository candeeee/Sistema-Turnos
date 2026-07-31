import { createClient } from '@/lib/supabase/server'
import { DataError } from '@/utils/log'
import type { DashboardStats } from '@/types/domain'

/** Claves numéricas que la función SQL siempre devuelve. */
const CLAVES = [
  'today',
  'tomorrow',
  'week',
  'pendingDeposit',
  'clients',
  'newClientsMonth',
  'completedMonth',
] as const

/**
 * `admin_dashboard_stats()` devuelve `json`, y PostgreSQL no puede describir
 * la forma de ese objeto: para los tipos generados es `Json` y nada más. Por
 * eso la forma se verifica acá, en tiempo de ejecución, en lugar de afirmarla
 * con un `as` que TypeScript aceptaría sin comprobar nada.
 *
 * Si la función SQL cambia y deja de devolver una clave, el error aparece con
 * el nombre de la clave faltante en vez de manifestarse como un `undefined`
 * en la pantalla.
 */
function parseStats(data: unknown): DashboardStats {
  if (typeof data !== 'object' || data === null) {
    throw new Error('admin_dashboard_stats() no devolvió un objeto.')
  }

  const raw = data as Record<string, unknown>
  const faltantes = CLAVES.filter((clave) => typeof raw[clave] !== 'number')

  if (faltantes.length > 0) {
    throw new Error(
      `admin_dashboard_stats() no devolvió: ${faltantes.join(', ')}. ` +
        'Revisá que la migración 20260730120000_fixes.sql esté aplicada.',
    )
  }

  const topServices = Array.isArray(raw.topServices)
    ? raw.topServices.flatMap((item) => {
        if (typeof item !== 'object' || item === null) return []
        const fila = item as Record<string, unknown>
        return typeof fila.name === 'string' && typeof fila.total === 'number'
          ? [{ name: fila.name, total: fila.total }]
          : []
      })
    : []

  return {
    today: raw.today as number,
    tomorrow: raw.tomorrow as number,
    week: raw.week as number,
    pendingDeposit: raw.pendingDeposit as number,
    clients: raw.clients as number,
    newClientsMonth: raw.newClientsMonth as number,
    completedMonth: raw.completedMonth as number,
    topServices,
  }
}

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

  try {
    return parseStats(data)
  } catch (parseError) {
    throw new DataError('getDashboardStats', parseError, { rpc: 'admin_dashboard_stats' })
  }
}
