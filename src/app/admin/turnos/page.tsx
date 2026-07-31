import { listAppointments } from '@/lib/services/admin/appointments'
import { listAllServices } from '@/lib/services/admin/catalog'
import { getBusinessSettings } from '@/lib/services/settings'
import { toMessaging } from '@/lib/services/admin/messaging'
import { APPOINTMENT_STATUS, APPOINTMENT_STATUSES } from '@/lib/constants'
import { AppointmentsTable } from '@/components/admin/AppointmentsTable'
import type { AppointmentStatus } from '@/types/domain'

export const dynamic = 'force-dynamic'

const CAMPO =
  'w-full min-w-0 rounded-[var(--radius-soft)] border border-transparent bg-veil/50 px-3.5 py-2.5 text-sm transition-colors duration-300 focus:border-accent/60 focus:bg-surface focus:outline-none'

/**
 * Los filtros viajan en la URL: cada búsqueda queda enlazable y compartible, y
 * el listado se resuelve en el servidor sin estado en el cliente.
 */
export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    estado?: string
    buscar?: string
    desde?: string
    hasta?: string
    servicio?: string
  }>
}) {
  const params = await searchParams
  const [settings, services] = await Promise.all([getBusinessSettings(), listAllServices()])

  const status = APPOINTMENT_STATUSES.includes(params.estado as AppointmentStatus)
    ? (params.estado as AppointmentStatus)
    : 'all'

  // Con filtros aplicados el panel arranca abierto: si alguien llegó desde un
  // enlace filtrado, tiene que ver por qué el listado está recortado.
  const hayFiltros = Boolean(
    params.buscar || params.estado || params.servicio || params.desde || params.hasta,
  )

  const appointments = await listAppointments({
    status,
    search: params.buscar,
    serviceId: params.servicio || undefined,
    from: params.desde ? new Date(`${params.desde}T00:00:00`).toISOString() : undefined,
    to: params.hasta ? new Date(`${params.hasta}T23:59:59`).toISOString() : undefined,
  })

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
          {appointments.length} {appointments.length === 1 ? 'resultado' : 'resultados'}
        </p>
        <h1 className="mt-2 font-display text-3xl font-light sm:text-4xl lg:text-5xl">Turnos</h1>
      </header>

      {/*
        Cinco campos de filtro ocupaban la pantalla entera de un celular antes
        de mostrar un solo turno. Van dentro de un <details>: cerrado por
        defecto, abierto si hay filtros activos, y sin una línea de JavaScript.
      */}
      <details
        open={hayFiltros}
        className="group min-w-0 rounded-[var(--radius-card)] border border-line bg-surface shadow-soft"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-sm sm:px-5">
          <span>{hayFiltros ? 'Filtros aplicados' : 'Filtros y búsqueda'}</span>
          <span
            aria-hidden
            className="text-muted transition-transform duration-300 group-open:rotate-180"
          >
            ⌄
          </span>
        </summary>

        <form role="search" className="grid gap-3 px-4 pb-5 sm:grid-cols-2 sm:px-5 lg:grid-cols-6">
          <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="buscar" className="text-xs text-muted">
              Buscar cliente
            </label>
            <input
              id="buscar"
              name="buscar"
              defaultValue={params.buscar ?? ''}
              placeholder="Nombre, teléfono o email"
              className={CAMPO}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="estado" className="text-xs text-muted">
              Estado
            </label>
            <select id="estado" name="estado" defaultValue={params.estado ?? ''} className={CAMPO}>
              <option value="">Todos</option>
              {APPOINTMENT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {APPOINTMENT_STATUS[value].label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="servicio" className="text-xs text-muted">
              Servicio
            </label>
            <select
              id="servicio"
              name="servicio"
              defaultValue={params.servicio ?? ''}
              className={CAMPO}
            >
              <option value="">Todos</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-1 lg:col-span-3">
            <label htmlFor="desde" className="text-xs text-muted">
              Desde
            </label>
            <input
              id="desde"
              name="desde"
              type="date"
              defaultValue={params.desde ?? ''}
              className={`tnum ${CAMPO}`}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-1 lg:col-span-3">
            <label htmlFor="hasta" className="text-xs text-muted">
              Hasta
            </label>
            <input
              id="hasta"
              name="hasta"
              type="date"
              defaultValue={params.hasta ?? ''}
              className={`tnum ${CAMPO}`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 sm:col-span-2 lg:col-span-6">
            <button
              type="submit"
              className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white shadow-soft transition-all duration-300 hover:bg-accent-hover active:scale-[0.98]"
            >
              Filtrar
            </button>
            <a
              href="/admin/turnos"
              className="rounded-full border border-line px-6 py-2.5 text-sm transition-colors duration-300 hover:border-ink"
            >
              Limpiar
            </a>
          </div>
        </form>
      </details>

      <AppointmentsTable
        appointments={appointments}
        timeZone={settings.timezone}
        messaging={toMessaging(settings)}
      />
    </div>
  )
}
