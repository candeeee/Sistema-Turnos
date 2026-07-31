import type { AppointmentStatus, ScheduleExceptionType } from '@/types/database.types'

/**
 * Etiquetas y color de cada estado. Un solo lugar: el calendario, la tabla de
 * turnos y "Mi cuenta" tienen que decir exactamente lo mismo.
 */
export const APPOINTMENT_STATUS: Record<
  AppointmentStatus,
  { label: string; short: string; color: string; isTerminal: boolean }
> = {
  pending_confirmation: {
    label: 'Pendiente de confirmación',
    short: 'Pendiente',
    color: 'var(--color-status-pending)',
    isTerminal: false,
  },
  confirmed: {
    label: 'Confirmado',
    short: 'Confirmado',
    color: 'var(--color-status-confirmed)',
    isTerminal: false,
  },
  in_progress: {
    label: 'En curso',
    short: 'En curso',
    color: 'var(--color-status-progress)',
    isTerminal: false,
  },
  completed: {
    label: 'Finalizado',
    short: 'Finalizado',
    color: 'var(--color-status-completed)',
    isTerminal: true,
  },
  cancelled_by_client: {
    label: 'Cancelado por el cliente',
    short: 'Cancelado',
    color: 'var(--color-status-cancelled)',
    isTerminal: true,
  },
  cancelled_by_business: {
    label: 'Cancelado por el negocio',
    short: 'Cancelado',
    color: 'var(--color-status-cancelled)',
    isTerminal: true,
  },
  rescheduled: {
    label: 'Reprogramado',
    short: 'Reprogramado',
    color: 'var(--color-status-rescheduled)',
    isTerminal: true,
  },
  no_show: {
    label: 'No asistió',
    short: 'No asistió',
    color: 'var(--color-status-noshow)',
    isTerminal: true,
  },
}

export const APPOINTMENT_STATUSES = Object.keys(APPOINTMENT_STATUS) as AppointmentStatus[]

export const ACTIVE_STATUSES: AppointmentStatus[] = [
  'pending_confirmation',
  'confirmed',
  'in_progress',
]

export const SCHEDULE_EXCEPTION_LABEL: Record<ScheduleExceptionType, string> = {
  holiday: 'Feriado',
  vacation: 'Vacaciones',
  block: 'Bloqueo',
}

/** 0 = domingo, como `extract(dow)` en PostgreSQL. */
export const WEEKDAYS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
] as const

/**
 * Zonas horarias ofrecidas en el panel. La lista es corta a propósito: el
 * sistema se instala por negocio y una lista de 400 zonas solo agrega chances
 * de elegir mal. Si hace falta otra, se agrega acá.
 */
export const TIMEZONES = [
  'America/Argentina/Buenos_Aires',
  'America/Argentina/Cordoba',
  'America/Argentina/Mendoza',
  'America/Argentina/Salta',
  'America/Argentina/Tucuman',
  'America/Argentina/Ushuaia',
  'America/Montevideo',
  'America/Santiago',
  'America/Asuncion',
  'America/Sao_Paulo',
  'America/Bogota',
  'America/Lima',
  'America/Mexico_City',
  'Europe/Madrid',
] as const

export const ROUTES = {
  home: '/',
  services: '/servicios',
  book: '/reservar',
  contact: '/contacto',
  account: '/mi-cuenta',
  appointments: '/mis-turnos',
  signIn: '/ingresar',
  signUp: '/crear-cuenta',
  admin: '/admin',
  adminNotifications: '/admin/notificaciones',
  adminDiagnostics: '/admin/diagnostico',
} as const
