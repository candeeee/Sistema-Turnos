import Link from 'next/link'

import { getDashboardStats } from '@/lib/services/admin/dashboard'
import { getAppointmentsInRange } from '@/lib/services/admin/appointments'
import { getBusinessSettings } from '@/lib/services/settings'
import { StatCard } from '@/components/admin/StatCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatPrice, formatTime } from '@/utils/format'
import { addDays, rangeIso, toDateKey } from '@/utils/date'

export default async function AdminDashboardPage() {
  const settings = await getBusinessSettings()
  const today = toDateKey(new Date(), settings.timezone)
  const { from, to } = rangeIso(today, addDays(today, 1), settings.timezone)

  const [stats, todayAppointments] = await Promise.all([
    getDashboardStats(),
    getAppointmentsInRange(from, to),
  ])

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="font-display text-3xl sm:text-4xl">Dashboard</h1>
        <p className="mt-2 text-sm text-muted">Cómo viene la agenda hoy.</p>
      </header>

      <section aria-label="Métricas" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Hoy" value={stats.today} href="/admin/calendario?vista=dia" index={0} />
        <StatCard
          label="Mañana"
          value={stats.tomorrow}
          href={`/admin/calendario?vista=dia&fecha=${addDays(today, 1)}`}
          index={1}
        />
        <StatCard
          label="Esta semana"
          value={stats.week}
          href="/admin/calendario?vista=semana"
          index={2}
        />
        <StatCard
          label="Esperando seña"
          value={stats.pendingDeposit}
          tone={stats.pendingDeposit > 0 ? 'alert' : 'default'}
          href="/admin/turnos?estado=pending_confirmation"
          index={3}
        />
        <StatCard
          label="Clientes"
          value={stats.clients}
          hint={`${stats.newClientsMonth} nuevos este mes`}
          href="/admin/clientes"
          index={4}
        />
        <StatCard
          label="Finalizados este mes"
          value={stats.completedMonth}
          index={5}
        />
      </section>

      <section aria-labelledby="hoy">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 id="hoy" className="text-xs uppercase tracking-[0.15em] text-muted">
            Turnos de hoy
          </h2>
          <Link
            href="/admin/calendario?vista=dia"
            className="text-sm text-muted transition-colors duration-200 hover:text-accent"
          >
            Ver calendario →
          </Link>
        </div>

        {todayAppointments.length === 0 ? (
          <p className="rounded-[var(--radius-card)] border border-line bg-surface p-6 text-sm text-muted">
            No hay turnos agendados para hoy.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {todayAppointments.map((appointment) => (
              <li key={appointment.id}>
                <Link
                  href={`/admin/turnos?buscar=${encodeURIComponent(appointment.client?.phone ?? '')}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[var(--radius-card)] border border-line bg-surface px-5 py-3.5 transition-colors duration-200 hover:border-ink"
                >
                  <span className="tnum text-lg">
                    {formatTime(appointment.starts_at, settings.timezone)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {appointment.client?.full_name ?? 'Cliente eliminado'}
                    <span className="text-muted"> · {appointment.service?.name}</span>
                  </span>
                  <span className="tnum text-sm text-muted">
                    {formatPrice(appointment.price_snapshot)}
                  </span>
                  <StatusBadge status={appointment.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {stats.topServices.length > 0 && (
        <section aria-labelledby="top">
          <h2 id="top" className="mb-4 text-xs uppercase tracking-[0.15em] text-muted">
            Servicios más solicitados · últimos 90 días
          </h2>

          <ul className="flex flex-col gap-2.5">
            {stats.topServices.map((service) => {
              const max = stats.topServices[0]?.total || 1
              const width = Math.round((service.total / max) * 100)

              return (
                <li key={service.name} className="flex items-center gap-4">
                  <span className="w-40 shrink-0 truncate text-sm">{service.name}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                    <span
                      className="block h-full rounded-full bg-accent transition-all duration-700 ease-[var(--ease-soft)]"
                      style={{ width: `${width}%` }}
                    />
                  </span>
                  <span className="tnum w-8 shrink-0 text-right text-sm text-muted">
                    {service.total}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
