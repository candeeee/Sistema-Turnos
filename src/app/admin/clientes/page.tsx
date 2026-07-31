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
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
          {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}
        </p>
        <h1 className="mt-2 font-display text-3xl font-light sm:text-4xl lg:text-5xl">Clientes</h1>
      </header>

      <form role="search" className="flex min-w-0 gap-2">
        <label htmlFor="buscar" className="sr-only">
          Buscar cliente
        </label>
        <input
          id="buscar"
          name="buscar"
          defaultValue={params.buscar ?? ''}
          placeholder="Nombre, teléfono o email"
          className="min-w-0 flex-1 rounded-[var(--radius-soft)] border border-transparent bg-veil/50 px-4 py-2.5 text-sm transition-colors duration-300 focus:border-accent/60 focus:bg-surface focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-soft transition-all duration-300 hover:bg-accent-hover active:scale-[0.98]"
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
                className="block min-w-0 rounded-[var(--radius-card)] border border-line bg-surface px-4 py-4 shadow-soft transition-all duration-300 hover:border-accent/40 sm:px-5"
              >
                {/* Nombre y contacto arriba, métricas debajo: en celular una
                    sola fila con cinco datos obligaba a scroll horizontal. */}
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{client.full_name}</span>
                    <span className="tnum block truncate text-sm text-muted">
                      {client.phone}
                      {client.email && ` · ${client.email}`}
                    </span>
                  </span>

                  {client.upcoming_count > 0 && (
                    <span className="tnum shrink-0 rounded-full bg-accent-soft px-3 py-1 text-xs text-accent-ink">
                      {client.upcoming_count} próximo{client.upcoming_count > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="tnum mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <span>{client.total_appointments} turnos</span>
                  {client.no_show_count > 0 && (
                    <span className="text-status-noshow">
                      {client.no_show_count} sin asistir
                    </span>
                  )}
                  {client.last_visit && (
                    <span>Última visita {formatDateTime(client.last_visit, settings.timezone)}</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
