import Link from 'next/link'

import { listClients } from '@/lib/services/admin/clients'
import { getBusinessSettings } from '@/lib/services/settings'
import { formatDateTime } from '@/utils/format'

export const dynamic = 'force-dynamic'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ buscar?: string }>
}) {
  const params = await searchParams
  const [settings, clients] = await Promise.all([
    getBusinessSettings(),
    listClients(params.buscar ?? ''),
  ])

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl sm:text-4xl">Clientes</h1>
        <p className="mt-1 text-sm text-muted">
          {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}
        </p>
      </header>

      <form role="search" className="flex gap-2">
        <label htmlFor="buscar" className="sr-only">
          Buscar cliente
        </label>
        <input
          id="buscar"
          name="buscar"
          defaultValue={params.buscar ?? ''}
          placeholder="Nombre, teléfono o email"
          className="flex-1 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm"
        />
        <button
          type="submit"
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-accent-hover"
        >
          Buscar
        </button>
      </form>

      {clients.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-line bg-surface p-6 text-sm text-muted">
          No encontramos clientes con esa búsqueda.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {clients.map((client) => (
            <li key={client.id}>
              <Link
                href={`/admin/clientes/${client.id}`}
                className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-[var(--radius-card)] border border-line bg-surface px-5 py-4 transition-colors duration-200 hover:border-ink"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{client.full_name}</span>
                  <span className="tnum block truncate text-sm text-muted">
                    {client.phone}
                    {client.email && ` · ${client.email}`}
                  </span>
                </span>

                <span className="tnum text-sm text-muted">
                  {client.total_appointments} turnos
                  {client.no_show_count > 0 && (
                    <span className="text-status-noshow"> · {client.no_show_count} sin asistir</span>
                  )}
                </span>

                {client.upcoming_count > 0 && (
                  <span className="tnum rounded-full bg-accent-soft px-3 py-1 text-xs text-accent">
                    {client.upcoming_count} próximo{client.upcoming_count > 1 ? 's' : ''}
                  </span>
                )}

                {client.last_visit && (
                  <span className="tnum text-xs text-muted">
                    Última visita {formatDateTime(client.last_visit, settings.timezone)}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
