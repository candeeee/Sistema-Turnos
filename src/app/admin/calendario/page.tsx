import Link from 'next/link'

import { getAppointmentsInRange } from '@/lib/services/admin/appointments'
import { getBusinessSettings } from '@/lib/services/settings'
import { APPOINTMENT_STATUS, WEEKDAYS } from '@/lib/constants'
import { formatDateLong, formatDayNumber, formatMonth, formatTime } from '@/utils/format'
import {
  addDays,
  addMonths,
  firstDayOfMonth,
  isSameMonth,
  monthGrid,
  rangeIso,
  toDateKey,
  weekdayIndex,
  type DateKey,
} from '@/utils/date'
import type { AdminAppointment } from '@/lib/services/admin/appointments'

// El mes visible depende de la fecha del negocio, no de la del build.
export const dynamic = 'force-dynamic'

type View = 'dia' | 'semana' | 'mes'

const VIEWS: { value: View; label: string }[] = [
  { value: 'dia', label: 'Día' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
]

/** Rango de días que abarca cada vista. `to` es exclusivo. */
function viewRange(view: View, date: DateKey): { from: DateKey; to: DateKey } {
  if (view === 'dia') return { from: date, to: addDays(date, 1) }
  if (view === 'semana') {
    const start = addDays(date, -weekdayIndex(date))
    return { from: start, to: addDays(start, 7) }
  }
  const grid = monthGrid(date)
  return { from: grid[0]!, to: addDays(grid[41]!, 1) }
}

function step(view: View, date: DateKey, direction: 1 | -1): DateKey {
  if (view === 'dia') return addDays(date, direction)
  if (view === 'semana') return addDays(date, 7 * direction)
  return firstDayOfMonth(addMonths(date, direction))
}

function title(view: View, date: DateKey): string {
  if (view === 'dia') return formatDateLong(`${date}T12:00:00Z`, 'UTC')
  if (view === 'mes') return formatMonth(date)

  const start = addDays(date, -weekdayIndex(date))
  const end = addDays(start, 6)
  return `${formatDayNumber(start)} al ${formatDayNumber(end)} de ${formatMonth(end).toLowerCase()}`
}

function href(view: View, date: DateKey) {
  return `/admin/calendario?vista=${view}&fecha=${date}`
}

function AppointmentChip({
  appointment,
  timeZone,
  compact = false,
}: {
  appointment: AdminAppointment
  timeZone: string
  compact?: boolean
}) {
  const color = APPOINTMENT_STATUS[appointment.status].color

  return (
    <Link
      href={`/admin/turnos?buscar=${encodeURIComponent(appointment.client?.phone ?? '')}`}
      className="block rounded-[10px] border-l-2 px-2.5 py-2 transition-all duration-300 hover:-translate-y-px hover:shadow-soft"
      style={{ borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 9%, transparent)` }}
      title={`${APPOINTMENT_STATUS[appointment.status].label} · ${appointment.service?.name ?? ''}`}
    >
      <span className="tnum text-xs" style={{ color }}>
        {formatTime(appointment.starts_at, timeZone)}
      </span>
      <span className={`block truncate ${compact ? 'text-xs' : 'text-sm'}`}>
        {appointment.client?.full_name ?? 'Sin cliente'}
      </span>
      {!compact && (
        <span className="block truncate text-xs text-muted">{appointment.service?.name}</span>
      )}
    </Link>
  )
}

/**
 * Agenda del día.
 *
 * Cada turno ocupa una altura proporcional a su duración real, así que un
 * servicio de dos horas se ve como el doble de uno de una. Una lista uniforme
 * no permite ver de un vistazo cuánto queda libre entre turno y turno, que es
 * justamente lo que se necesita mirar en la agenda de un día.
 *
 * El rango horario se deriva de los turnos del día, con una hora de margen
 * arriba y abajo: mostrar de 00 a 24 desperdicia dos tercios de la pantalla.
 */
function DayAgenda({ items, timeZone }: { items: AdminAppointment[]; timeZone: string }) {
  if (items.length === 0) {
    return (
      <section className="rounded-[var(--radius-card)] border border-line bg-surface p-12 text-center shadow-soft">
        <p className="font-display text-2xl font-light">Día libre</p>
        <p className="mt-2 text-sm text-muted">No hay turnos agendados.</p>
      </section>
    )
  }

  const PX_POR_MINUTO = 1.15

  const minutosDe = (iso: string) => {
    const [hora, minuto] = formatTime(iso, timeZone).split(':').map(Number)
    return (hora ?? 0) * 60 + (minuto ?? 0)
  }

  const inicios = items.map((item) => minutosDe(item.starts_at))
  const finales = items.map((item) => minutosDe(item.ends_at))

  const desde = Math.max(0, Math.floor(Math.min(...inicios) / 60) * 60 - 60)
  const hasta = Math.min(24 * 60, Math.ceil(Math.max(...finales) / 60) * 60 + 60)

  const horas = Array.from(
    { length: Math.ceil((hasta - desde) / 60) + 1 },
    (_, index) => desde + index * 60,
  )

  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-soft sm:p-7">
      <div className="relative" style={{ height: (hasta - desde) * PX_POR_MINUTO }}>
        {horas.map((minuto) => (
          <div
            key={minuto}
            className="absolute inset-x-0 flex items-center gap-4"
            style={{ top: (minuto - desde) * PX_POR_MINUTO }}
          >
            <span className="tnum w-10 shrink-0 text-right text-[11px] text-muted sm:w-12 sm:text-xs">
              {String(Math.floor(minuto / 60)).padStart(2, '0')}:00
            </span>
            <span className="h-px flex-1 bg-line/70" />
          </div>
        ))}

        <div className="absolute inset-y-0 left-[3.25rem] right-0 sm:left-16">
          {items.map((item) => {
            const inicio = minutosDe(item.starts_at)
            const duracion = Math.max(minutosDe(item.ends_at) - inicio, 25)
            const color = APPOINTMENT_STATUS[item.status].color

            return (
              <Link
                key={item.id}
                href={`/admin/turnos?buscar=${encodeURIComponent(item.client?.phone ?? '')}`}
                className="absolute inset-x-0 flex flex-col justify-center overflow-hidden rounded-[14px] border-l-[3px] px-4 transition-all duration-300 hover:-translate-y-px hover:shadow-soft"
                style={{
                  top: (inicio - desde) * PX_POR_MINUTO,
                  height: duracion * PX_POR_MINUTO - 4,
                  borderColor: color,
                  backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
                }}
              >
                <span className="tnum text-xs" style={{ color }}>
                  {formatTime(item.starts_at, timeZone)} – {formatTime(item.ends_at, timeZone)}
                </span>
                <span className="truncate text-sm">{item.client?.full_name ?? 'Sin cliente'}</span>
                {duracion > 45 && (
                  <span className="truncate text-xs text-muted">{item.service?.name}</span>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; fecha?: string }>
}) {
  const params = await searchParams
  const settings = await getBusinessSettings()
  const today = toDateKey(new Date(), settings.timezone)

  const view: View = VIEWS.some((v) => v.value === params.vista) ? (params.vista as View) : 'semana'
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.fecha ?? '') ? params.fecha! : today

  const { from, to } = viewRange(view, date)
  const { from: fromIso, to: toIso } = rangeIso(from, to, settings.timezone)
  const appointments = await getAppointmentsInRange(fromIso, toIso)

  // Agrupar una vez por día evita recorrer la lista completa en cada celda.
  const byDay = new Map<DateKey, AdminAppointment[]>()
  for (const appointment of appointments) {
    const key = toDateKey(new Date(appointment.starts_at), settings.timezone)
    const list = byDay.get(key)
    if (list) list.push(appointment)
    else byDay.set(key, [appointment])
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(from, i))

  return (
    <div className="flex flex-col gap-6">
      <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Agenda</p>
          <h1 className="mt-2 font-display text-3xl font-light leading-tight sm:text-4xl lg:text-5xl">
            {title(view, date)}
          </h1>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href={href(view, step(view, date, -1))}
            aria-label="Anterior"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-muted transition-all duration-300 hover:border-accent/50 hover:text-accent"
          >
            ‹
          </Link>
          <Link
            href={href(view, today)}
            className="rounded-full border border-line bg-surface px-5 py-2 text-sm transition-all duration-300 hover:border-accent/50 hover:text-accent"
          >
            Hoy
          </Link>
          <Link
            href={href(view, step(view, date, 1))}
            aria-label="Siguiente"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-muted transition-all duration-300 hover:border-accent/50 hover:text-accent"
          >
            ›
          </Link>

          <div className="ml-1 flex rounded-full border border-line bg-surface p-1 shadow-soft">
            {VIEWS.map((option) => (
              <Link
                key={option.value}
                href={href(option.value, date)}
                className={`rounded-full px-4 py-1.5 text-sm transition-all duration-300 ${
                  option.value === view
                    ? 'bg-accent text-white shadow-soft'
                    : 'text-muted hover:text-accent'
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Día · agenda con altura proporcional a la duración */}
      {view === 'dia' && <DayAgenda items={byDay.get(date) ?? []} timeZone={settings.timezone} />}

      {/* Semana */}
      {view === 'semana' && (
        <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-7">
          {weekDays.map((day) => {
            const list = byDay.get(day) ?? []

            return (
              <div
                key={day}
                className={`rounded-[var(--radius-card)] border bg-surface p-4 shadow-soft transition-shadow duration-300 hover:shadow-lifted ${
                  day === today ? 'border-accent/60' : 'border-line'
                }`}
              >
                <Link href={href('dia', day)} className="block">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted">
                    {WEEKDAYS[weekdayIndex(day)]?.slice(0, 3)}
                  </p>
                  <p
                    className={`tnum mt-1 font-display text-2xl font-light ${
                      day === today ? 'text-accent' : ''
                    }`}
                  >
                    {formatDayNumber(day)}
                  </p>
                </Link>

                <ul className="mt-2 flex flex-col gap-1.5">
                  {list.map((appointment) => (
                    <li key={appointment.id}>
                      <AppointmentChip
                        appointment={appointment}
                        timeZone={settings.timezone}
                        compact
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </section>
      )}

      {/* Mes */}
      {view === 'mes' && (
        {/* `min-w-0` es imprescindible: sin él, este hijo de flex se niega a
            encogerse por debajo de los 640px de la grilla y estira la página
            entera en lugar de scrollear dentro de su propia caja. */}
        <section className="min-w-0 overflow-x-auto">
          {/* min-w-[640px] es deliberado: siete columnas de un mes no entran
              en una pantalla de celular, y comprimirlas las vuelve ilegibles.
              La sección de arriba tiene `min-w-0 overflow-x-auto`, así que el
              scroll queda dentro de esta caja y no estira la página. */}
          <div className="grid min-w-[640px] grid-cols-7 gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line shadow-soft" /* responsive-ok */>
            {WEEKDAYS.map((label) => (
              <p
                key={label}
                className="bg-veil/60 px-2 py-3 text-center text-[10px] uppercase tracking-[0.14em] text-muted"
              >
                {label.slice(0, 3)}
              </p>
            ))}

            {monthGrid(date).map((day) => {
              const list = byDay.get(day) ?? []

              return (
                <div
                  key={day}
                  className={`min-h-28 bg-surface p-2 transition-colors duration-300 ${
                    isSameMonth(day, date) ? '' : 'bg-veil/30 opacity-50'
                  }`}
                >
                  <Link
                    href={href('dia', day)}
                    className={`tnum block text-xs ${day === today ? 'text-accent' : 'text-muted'}`}
                  >
                    {formatDayNumber(day)}
                  </Link>

                  <ul className="mt-1 flex flex-col gap-1">
                    {list.slice(0, 3).map((appointment) => (
                      <li key={appointment.id}>
                        <AppointmentChip
                          appointment={appointment}
                          timeZone={settings.timezone}
                          compact
                        />
                      </li>
                    ))}
                    {list.length > 3 && (
                      <li className="tnum px-2 text-[11px] text-muted">+{list.length - 3} más</li>
                    )}
                  </ul>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Referencia de colores */}
      <ul className="flex flex-wrap gap-x-5 gap-y-2 rounded-[var(--radius-card)] bg-veil/40 px-5 py-4">
        {Object.entries(APPOINTMENT_STATUS).map(([status, config]) => (
          <li key={status} className="flex items-center gap-1.5 text-xs text-muted">
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: config.color }}
            />
            {config.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
