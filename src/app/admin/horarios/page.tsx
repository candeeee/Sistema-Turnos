import { listBusinessHours, listScheduleExceptions } from '@/lib/services/admin/schedule'
import { getBusinessSettings } from '@/lib/services/settings'
import { ExceptionsEditor, HoursEditor } from '@/components/admin/ScheduleEditors'

export const dynamic = 'force-dynamic'

export default async function SchedulePage() {
  const [settings, hours, exceptions] = await Promise.all([
    getBusinessSettings(),
    listBusinessHours(),
    listScheduleExceptions(),
  ])

  return (
    <div className="flex min-w-0 flex-col gap-10">
      <header>
        <h1 className="font-display text-3xl font-light sm:text-4xl lg:text-5xl">Horarios</h1>
        <p className="mt-1 text-sm text-muted">
          De acá salen los horarios que ve el cliente al reservar. Un día sin franjas es un día
          cerrado.
        </p>
      </header>

      <section aria-labelledby="franjas">
        <h2 id="franjas" className="mb-4 text-xs uppercase tracking-[0.15em] text-muted">
          Días y horarios de atención
        </h2>
        <HoursEditor hours={hours} />
      </section>

      <section aria-labelledby="bloqueos">
        <h2 id="bloqueos" className="mb-1 text-xs uppercase tracking-[0.15em] text-muted">
          Feriados, vacaciones y bloqueos
        </h2>
        <p className="mb-4 text-sm text-muted">
          Los turnos ya reservados dentro de un bloqueo no se cancelan solos: revisalos en el
          calendario y avisale a cada cliente.
        </p>
        <ExceptionsEditor exceptions={exceptions} timeZone={settings.timezone} />
      </section>
    </div>
  )
}
