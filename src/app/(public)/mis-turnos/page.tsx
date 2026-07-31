import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getBusinessSettings, whatsappLink } from '@/lib/services/settings'
import { getCurrentClient } from '@/lib/services/clients'
import { getMyPastAppointments, getMyUpcomingAppointments } from '@/lib/services/appointments'
import { ROUTES } from '@/lib/constants'
import { toDateKey } from '@/utils/date'
import { AppointmentCard } from '@/components/account/AppointmentCard'

export const metadata: Metadata = { title: 'Mis turnos' }

// Los turnos cambian de estado desde el panel: siempre datos frescos.
export const dynamic = 'force-dynamic'

export default async function MyAppointmentsPage() {
  const client = await getCurrentClient()

  if (!client) {
    redirect(`${ROUTES.signIn}?redirect=${encodeURIComponent(ROUTES.appointments)}`)
  }

  const [settings, upcoming, past] = await Promise.all([
    getBusinessSettings(),
    getMyUpcomingAppointments(),
    getMyPastAppointments(),
  ])

  const today = toDateKey(new Date(), settings.timezone)

  const accountSettings = {
    timezone: settings.timezone,
    maxDaysAhead: settings.max_days_ahead,
    minHoursBeforeCancel: settings.min_hours_before_cancel,
    depositAlias: settings.deposit_alias,
    depositCbu: settings.deposit_cbu,
    whatsappUrl: whatsappLink(settings, 'Hola, te escribo por mi turno.'),
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Tu agenda</p>
          <h1 className="mt-3 font-display text-5xl font-light leading-[1.05] sm:text-6xl">
            Hola, {client.full_name.split(' ')[0]}
          </h1>
        </div>

        <Link
          href={ROUTES.book}
          className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-white shadow-soft transition-all duration-300 hover:bg-accent-hover hover:shadow-lifted active:scale-[0.98]"
        >
          Reservar otro
        </Link>
      </div>

      <section className="mt-12" aria-labelledby="proximos">
        <h2 id="proximos" className="text-xs uppercase tracking-[0.15em] text-muted">
          Próximos turnos
        </h2>

        {upcoming.length === 0 ? (
          <p className="mt-4 rounded-[var(--radius-card)] border border-line bg-surface p-6 text-sm text-muted">
            No tenés turnos reservados.{' '}
            <Link href={ROUTES.book} className="text-accent underline-offset-4 hover:underline">
              Reservá uno
            </Link>{' '}
            cuando quieras.
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {upcoming.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                settings={accountSettings}
                today={today}
                editable
              />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="mt-14" aria-labelledby="historial">
          <h2 id="historial" className="text-xs uppercase tracking-[0.15em] text-muted">
            Historial
          </h2>

          <div className="mt-4 flex flex-col gap-4 opacity-90">
            {past.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                settings={accountSettings}
                today={today}
                editable={false}
              />
            ))}
          </div>
        </section>
      )}

      <p className="mt-14 text-sm text-muted">
        ¿Necesitás cambiar tu nombre, tu teléfono o tu contraseña?{' '}
        <Link href={ROUTES.account} className="text-accent underline-offset-4 hover:underline">
          Entrá a tu cuenta
        </Link>
        .
      </p>
    </main>
  )
}
