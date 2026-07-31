import Link from 'next/link'

import { getBusinessSettings, whatsappLink } from '@/lib/services/settings'
import { getFeaturedServices } from '@/lib/services/catalog'
import { getNextAvailability } from '@/lib/services/availability'
import { getBusinessHoursByWeekday } from '@/lib/services/schedule'
import { getSessionContext } from '@/lib/services/session'
import { ROUTES, WEEKDAYS } from '@/lib/constants'
import { formatDateLong, formatTime } from '@/utils/format'
import { toDateKey } from '@/utils/date'
import { ServiceCard } from '@/components/site/ServiceCard'

// La franja de horarios del hero sale de la agenda real: no puede cachearse.
export const dynamic = 'force-dynamic'

const STEPS = [
  { title: 'Elegí el servicio', text: 'Con su precio y su duración, sin sorpresas.' },
  { title: 'Reservá tu horario', text: 'Solo aparecen los que están realmente libres.' },
  { title: 'Confirmá con la seña', text: 'Una transferencia y el turno queda tuyo.' },
]

export default async function HomePage() {
  const settings = await getBusinessSettings()
  const [services, hours, session] = await Promise.all([
    getFeaturedServices(),
    getBusinessHoursByWeekday(),
    getSessionContext(),
  ])

  // El administrador ve la misma portada, pero sin los accesos de cliente:
  // no reserva turnos, así que los botones lo llevan a su panel.
  const isAdmin = session.isAdmin

  const today = toDateKey(new Date(), settings.timezone)
  const firstService = services[0]
  const availability = firstService ? await getNextAvailability(firstService.id, today) : null
  const whatsapp = whatsappLink(settings, 'Hola, quiero consultar por un turno.')

  const openDays = Object.entries(hours)
    .map(([weekday, franjas]) => ({
      weekday: Number(weekday),
      label: WEEKDAYS[Number(weekday)],
      ranges: franjas.map((f) => `${f.opens_at.slice(0, 5)}–${f.closes_at.slice(0, 5)}`),
    }))
    .sort((a, b) => (a.weekday === 0 ? 7 : a.weekday) - (b.weekday === 0 ? 7 : b.weekday))

  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
        <p
          className="animate-rise text-[11px] uppercase tracking-[0.22em] text-muted"
          style={{ '--delay': '0ms' } as React.CSSProperties}
        >
          Turnos online
        </p>

        <h1
          className="animate-rise mt-6 max-w-3xl font-display text-6xl font-light leading-[1.02] sm:text-[5.5rem]"
          style={{ '--delay': '70ms' } as React.CSSProperties}
        >
          {settings.name || 'Reservá tu turno'}
        </h1>

        <p
          className="animate-rise mt-6 max-w-xl text-lg leading-relaxed text-muted"
          style={{ '--delay': '140ms' } as React.CSSProperties}
        >
          Elegí el servicio, mirá los horarios que están libres de verdad y reservá en menos de un
          minuto. Sin llamados, sin esperar respuesta.
        </p>

        <div
          className="animate-rise mt-9 flex flex-wrap items-center gap-3"
          style={{ '--delay': '210ms' } as React.CSSProperties}
        >
          <Link
            href={isAdmin ? ROUTES.admin : ROUTES.book}
            className="rounded-full bg-accent px-8 py-4 text-sm font-medium text-white shadow-soft transition-all duration-300 hover:bg-accent-hover hover:shadow-lifted active:scale-[0.98]"
          >
            {isAdmin ? 'Ir al panel' : 'Reservar turno'}
          </Link>

          <Link
            href={ROUTES.services}
            className="rounded-full border border-line bg-surface px-8 py-4 text-sm font-medium transition-all duration-300 hover:border-accent/50 hover:text-accent"
          >
            Ver servicios
          </Link>
        </div>

        {/* Disponibilidad real: la agenda del negocio, en vivo. */}
        {availability && firstService && availability.slots.length > 0 && (
          <div
            className="animate-rise mt-16 rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-soft sm:p-8"
            style={{ '--delay': '280ms' } as React.CSSProperties}
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
              Próximos horarios · {firstService.name}
            </p>

            <p className="mt-2 text-sm">
              {formatDateLong(availability.slots[0]!.startsAt, settings.timezone)}
            </p>

            <ul className="mt-4 flex flex-wrap gap-2">
              {availability.slots.slice(0, 8).map((slot) => (
                <li key={slot.startsAt}>
                  <Link
                    href={isAdmin ? '/admin/calendario?vista=dia' : ROUTES.book}
                    className="tnum block rounded-full border border-line px-5 py-2.5 text-sm transition-all duration-300 ease-[var(--ease-soft)] hover:-translate-y-0.5 hover:border-accent hover:bg-accent-soft hover:text-accent-ink"
                  >
                    {formatTime(slot.startsAt, settings.timezone)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Servicios destacados */}
      {services.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className="font-display text-4xl font-light sm:text-5xl">Servicios</h2>
            <Link
              href={ROUTES.services}
              className="text-sm text-muted transition-colors duration-200 hover:text-accent"
            >
              Ver todos →
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.slice(0, 3).map((service, index) => (
              <ServiceCard
                key={service.id}
                service={service}
                index={index}
                showBooking={!isAdmin}
              />
            ))}
          </div>
        </section>
      )}

      {/* Cómo funciona */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <h2 className="font-display text-4xl font-light sm:text-5xl">Cómo funciona</h2>

        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="animate-rise border-t border-line pt-5"
              style={{ '--delay': `${index * 80}ms` } as React.CSSProperties}
            >
              <span className="tnum text-xs text-muted">{String(index + 1).padStart(2, '0')}</span>
              <h3 className="mt-2 text-lg">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Dónde estamos */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2">
          <div>
            <h2 className="font-display text-4xl font-light sm:text-5xl">Dónde estamos</h2>

            {settings.address && <p className="mt-5 text-lg">{settings.address}</p>}

            <div className="mt-6 flex flex-wrap gap-3">
              {settings.maps_url && (
                <a
                  href={settings.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-line bg-surface px-5 py-2.5 text-sm transition-colors duration-200 hover:border-ink"
                >
                  Cómo llegar
                </a>
              )}

              {whatsapp && (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-accent-hover"
                >
                  Escribinos por WhatsApp
                </a>
              )}
            </div>
          </div>

          {openDays.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-muted">Días de atención</p>

              <dl className="mt-4">
                {openDays.map((day) => (
                  <div
                    key={day.weekday}
                    className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-0"
                  >
                    <dt className="text-sm">{day.label}</dt>
                    <dd className="tnum text-sm text-muted">{day.ranges.join(' · ')}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
