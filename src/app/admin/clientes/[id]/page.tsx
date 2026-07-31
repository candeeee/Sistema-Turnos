import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getClient, getClientNotes } from '@/lib/services/admin/clients'
import { getClientAppointments } from '@/lib/services/admin/appointments'
import { getBusinessSettings, whatsappLink } from '@/lib/services/settings'
import { APPOINTMENT_STATUS } from '@/lib/constants'
import { formatDateTime, formatPrice } from '@/utils/format'
import { AppointmentsTable } from '@/components/admin/AppointmentsTable'
import { toMessaging } from '@/lib/services/admin/messaging'
import { ClientEditForm } from '@/components/admin/ClientEditForm'
import { ClientNotes } from '@/components/admin/ClientNotes'

export const dynamic = 'force-dynamic'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const client = await getClient(id)

  if (!client) notFound()

  const [settings, appointments, notes] = await Promise.all([
    getBusinessSettings(),
    getClientAppointments(id),
    getClientNotes(id),
  ])

  const completed = appointments.filter((a) => a.status === 'completed')
  const noShows = appointments.filter((a) => a.status === 'no_show').length
  const spent = completed.reduce((total, a) => total + Number(a.price_snapshot), 0)
  const upcoming = appointments.filter(
    (a) => new Date(a.starts_at) > new Date() && !APPOINTMENT_STATUS[a.status].isTerminal,
  )
  const history = appointments.filter((a) => !upcoming.includes(a))

  const whatsapp = whatsappLink(
    { ...settings, whatsapp: client.phone },
    `Hola ${client.full_name.split(' ')[0]}, te escribimos de ${settings.name}.`,
  )

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/admin/clientes"
        className="text-sm text-muted transition-colors duration-200 hover:text-ink"
      >
        ← Clientes
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl">{client.full_name}</h1>
          <p className="tnum mt-2 text-sm text-muted">
            {client.phone}
            {client.email && ` · ${client.email}`}
          </p>
          <p className="tnum mt-1 text-xs text-muted">
            Cliente desde {formatDateTime(client.created_at, settings.timezone)}
            {!client.user_id && ' · sin cuenta asociada'}
          </p>
        </div>

        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-accent-hover"
          >
            Escribir por WhatsApp
          </a>
        )}
      </header>

      <section aria-label="Resumen" className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Turnos', value: appointments.length },
          { label: 'Finalizados', value: completed.length },
          { label: 'No asistió', value: noShows },
          { label: 'Total gastado', value: formatPrice(spent) },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-[var(--radius-card)] border border-line bg-surface p-4"
          >
            <p className="text-xs uppercase tracking-[0.15em] text-muted">{stat.label}</p>
            <p className="tnum mt-2 text-2xl">{stat.value}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="observaciones">
        <h2 id="observaciones" className="mb-3 text-xs uppercase tracking-[0.15em] text-muted">
          Observaciones privadas
        </h2>
        <p className="mb-3 text-xs text-muted">
          Solo las ve el negocio. El cliente nunca accede a esta información.
        </p>
        <ClientNotes clientId={id} notes={notes} timeZone={settings.timezone} />
      </section>

      {upcoming.length > 0 && (
        <section aria-labelledby="proximos">
          <h2 id="proximos" className="mb-3 text-xs uppercase tracking-[0.15em] text-muted">
            Próximos turnos
          </h2>
          <AppointmentsTable
            appointments={upcoming}
            timeZone={settings.timezone}
            messaging={toMessaging(settings)}
          />
        </section>
      )}

      <section aria-labelledby="historial">
        <h2 id="historial" className="mb-3 text-xs uppercase tracking-[0.15em] text-muted">
          Historial
        </h2>
        <AppointmentsTable
          appointments={history}
          timeZone={settings.timezone}
          messaging={toMessaging(settings)}
        />
      </section>

      <section aria-labelledby="datos">
        <h2 id="datos" className="mb-3 text-xs uppercase tracking-[0.15em] text-muted">
          Datos de contacto
        </h2>
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <ClientEditForm
            clientId={client.id}
            fullName={client.full_name}
            phone={client.phone}
          />
        </div>
      </section>
    </div>
  )
}
