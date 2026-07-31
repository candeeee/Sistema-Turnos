import { listAppointments } from '@/lib/services/admin/appointments'
import { listAllServices } from '@/lib/services/admin/catalog'
import { getBusinessSettings } from '@/lib/services/settings'
import { APPOINTMENT_STATUS, APPOINTMENT_STATUSES } from '@/lib/constants'
import { AppointmentsTable } from '@/components/admin/AppointmentsTable'
import { toMessaging } from '@/lib/services/admin/messaging'
import type { AppointmentStatus } from '@/types/domain'

export const dynamic = 'force-dynamic'

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

  const appointments = await listAppointments({
    status,
    search: params.buscar,
    serviceId: params.servicio || undefined,
    from: params.desde ? new Date(`${params.desde}T00:00:00`).toISOString() : undefined,
    to: params.hasta ? new Date(`${params.hasta}T23:59:59`).toISOString() : undefined,
  })

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl sm:text-4xl">Turnos</h1>
        <p className="mt-1 text-sm text-muted">
          {appointments.length} {appointments.length === 1 ? 'resultado' : 'resultados'}
        </p>
      </header>

      <form
        className="grid gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5"
        role="search"
      >
        <div className="flex flex-col gap-1.5 lg:col-span-2">
          <label htmlFor="buscar" className="text-xs text-muted">
            Buscar cliente
          </label>
          <input
            id="buscar"
            name="buscar"
            defaultValue={params.buscar ?? ''}
            placeholder="Nombre, teléfono o email"
            className="rounded-xl border border-line bg-paper px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="estado" className="text-xs text-muted">
            Estado
          </label>
          <select
            id="estado"
            name="estado"
            defaultValue={params.estado ?? ''}
            className="rounded-xl border border-line bg-paper px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {APPOINTMENT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {APPOINTMENT_STATUS[value].label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="servicio" className="text-xs text-muted">
            Servicio
          </label>
          <select
            id="servicio"
            name="servicio"
            defaultValue={params.servicio ?? ''}
            className="rounded-xl border border-line bg-paper px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="desde" className="text-xs text-muted">
              Desde
            </label>
            <input
              id="desde"
              name="desde"
              type="date"
              defaultValue={params.desde ?? ''}
              className="tnum w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="hasta" className="text-xs text-muted">
              Hasta
            </label>
            <input
              id="hasta"
              name="hasta"
              type="date"
              defaultValue={params.hasta ?? ''}
              className="tnum w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex items-end gap-2 lg:col-span-5">
          <button
            type="submit"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-accent-hover"
          >
            Filtrar
          </button>
          <a
            href="/admin/turnos"
            className="rounded-full border border-line px-5 py-2.5 text-sm transition-colors duration-200 hover:border-ink"
          >
            Limpiar
          </a>
        </div>
      </form>

      <AppointmentsTable
        appointments={appointments}
        timeZone={settings.timezone}
        messaging={toMessaging(settings)}
      />
    </div>
  )
}
