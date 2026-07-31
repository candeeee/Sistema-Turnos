/**
 * Formateo de fechas, horas, precios y duraciones.
 *
 * Toda hora se formatea explícitamente en la zona horaria del negocio: si el
 * cliente está de viaje o tiene el reloj mal, su turno sigue mostrándose a la
 * hora real a la que tiene que presentarse.
 */

const LOCALE = 'es-AR'
const CURRENCY = 'ARS'

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount)
}

/** "1 h 30 min" · "45 min" */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  if (hours === 0) return `${rest} min`
  if (rest === 0) return `${hours} h`
  return `${hours} h ${rest} min`
}

/** "14:30" */
export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

/** "lunes 3 de agosto" */
export function formatDateLong(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(iso))
}

/** "lun 3 ago · 14:30" */
export function formatDateTime(iso: string, timeZone: string): string {
  const date = new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso))

  return `${date} · ${formatTime(iso, timeZone)}`
}

/** "agosto 2026", para el encabezado del calendario. */
export function formatMonth(dateKey: string): string {
  const [year, month] = dateKey.split('-').map(Number)
  const label = new Intl.DateTimeFormat(LOCALE, {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, 1)))

  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** Día del calendario a partir de un DateKey: "3". */
export function formatDayNumber(dateKey: string): string {
  return String(Number(dateKey.slice(8, 10)))
}
