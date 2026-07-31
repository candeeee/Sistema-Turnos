/**
 * Tipos del dominio.
 *
 * Todo lo escrito a mano vive acá y **deriva** de `database.types.ts`, que es
 * generado y no se toca. Esa separación es deliberada: mezclar ambas cosas en
 * un solo archivo hace que `npm run db:types` borre el código propio, y la
 * consecuencia práctica es que nadie vuelve a regenerar. Los tipos entonces
 * dejan de describir la base y empiezan a mentir —que es exactamente lo que
 * provocó el `never` del build y las plantillas indefinidas—.
 *
 * Regla: si un tipo se puede derivar del esquema, se deriva. Solo se declara
 * a mano lo que la base no expresa (por ejemplo, la forma del JSON que
 * devuelve `admin_dashboard_stats`).
 */

import type { Database } from '@/types/database.types'

export type { Database, Json } from '@/types/database.types'

/* -------------------------------------------------------------------------
 * Atajos sobre las tablas
 * ---------------------------------------------------------------------- */

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]

/* -------------------------------------------------------------------------
 * Enumerados
 * ---------------------------------------------------------------------- */

export type UserRole = Enums<'user_role'>
export type AppointmentStatus = Enums<'appointment_status'>
export type ScheduleExceptionType = Enums<'schedule_exception_type'>
export type ReminderKind = Enums<'reminder_kind'>
export type ReminderStatus = Enums<'reminder_status'>

/* -------------------------------------------------------------------------
 * Retornos de RPC
 * ---------------------------------------------------------------------- */

/**
 * `admin_dashboard_stats()` devuelve `json`, y PostgreSQL no puede describir
 * la forma de ese objeto: para el generador es `Json` y nada más. Esta es la
 * única estructura del proyecto que se declara a mano por necesidad.
 *
 * Si se agrega una métrica a la función SQL, hay que agregarla también acá.
 */
export type DashboardStats = {
  today: number
  tomorrow: number
  week: number
  pendingDeposit: number
  clients: number
  newClientsMonth: number
  completedMonth: number
  topServices: { name: string; total: number }[]
}

/** Fila de `admin_list_clients()`, derivada del retorno real de la función. */
export type ClientSummary = Database['public']['Functions']['admin_list_clients']['Returns'][number]

/** Fila de `get_due_reminders()`, para quien implemente el canal de envío. */
export type DueReminder = Database['public']['Functions']['get_due_reminders']['Returns'][number]

/** Fila de `get_available_slots()`, tal como la devuelve la base. */
export type AvailableSlot = Database['public']['Functions']['get_available_slots']['Returns'][number]
