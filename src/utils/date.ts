/**
 * Utilidades de fecha para el calendario.
 *
 * En todo el proyecto un "día" se representa como la cadena `YYYY-MM-DD` en la
 * zona horaria del negocio (un DateKey). Nunca se usa un objeto Date para
 * representar días: `new Date('2026-08-03')` se interpreta en UTC y en
 * Argentina eso es el 2 de agosto a las 21:00, un bug clásico de agendas.
 */

export type DateKey = string

const DAY_MS = 86_400_000

/** Convierte un instante a su día en la zona horaria indicada. */
export function toDateKey(date: Date, timeZone: string): DateKey {
  // 'en-CA' produce exactamente YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function parseDateKey(key: DateKey): { year: number; month: number; day: number } {
  const [year, month, day] = key.split('-').map(Number)
  return { year: year ?? 0, month: month ?? 1, day: day ?? 1 }
}

function toUTC(key: DateKey): number {
  const { year, month, day } = parseDateKey(key)
  return Date.UTC(year, month - 1, day)
}

function fromUTC(ms: number): DateKey {
  return new Date(ms).toISOString().slice(0, 10)
}

export function addDays(key: DateKey, days: number): DateKey {
  return fromUTC(toUTC(key) + days * DAY_MS)
}

export function addMonths(key: DateKey, months: number): DateKey {
  const { year, month } = parseDateKey(key)
  const total = year * 12 + (month - 1) + months
  return fromUTC(Date.UTC(Math.floor(total / 12), total % 12, 1))
}

/** 0 = domingo, igual que `extract(dow)` en PostgreSQL. */
export function weekdayIndex(key: DateKey): number {
  return new Date(toUTC(key)).getUTCDay()
}

export function firstDayOfMonth(key: DateKey): DateKey {
  const { year, month } = parseDateKey(key)
  return `${year}-${String(month).padStart(2, '0')}-01`
}

export function lastDayOfMonth(key: DateKey): DateKey {
  return addDays(addMonths(firstDayOfMonth(key), 1), -1)
}

export function isSameMonth(a: DateKey, b: DateKey): boolean {
  return a.slice(0, 7) === b.slice(0, 7)
}

/**
 * Grilla del mes: seis filas de siete días, empezando en domingo. Los días de
 * los meses vecinos se incluyen para que la grilla no tenga huecos.
 */
export function monthGrid(monthKey: DateKey): DateKey[] {
  const first = firstDayOfMonth(monthKey)
  const start = addDays(first, -weekdayIndex(first))
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

/**
 * Desfase horario de una zona en una fecha concreta, en formato "+03:00".
 * Se calcula por fecha y no una vez: el horario de verano lo cambia.
 */
export function zoneOffset(key: DateKey, timeZone: string): string {
  const label = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(new Date(`${key}T12:00:00Z`))
    .find((part) => part.type === 'timeZoneName')?.value

  return label?.replace('GMT', '') || '+00:00'
}

/**
 * Convierte un rango de días del negocio en instantes absolutos, listos para
 * consultar la base. `toKey` es exclusivo.
 */
export function rangeIso(
  fromKey: DateKey,
  toKey: DateKey,
  timeZone: string,
): { from: string; to: string } {
  return {
    from: new Date(`${fromKey}T00:00:00${zoneOffset(fromKey, timeZone)}`).toISOString(),
    to: new Date(`${toKey}T00:00:00${zoneOffset(toKey, timeZone)}`).toISOString(),
  }
}
