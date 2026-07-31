import { getBusinessSettings } from '@/lib/services/settings'
import { NotificationsForm } from '@/components/admin/NotificationsForm'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const settings = await getBusinessSettings()

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Comunicación</p>
        <h1 className="mt-3 font-display text-4xl font-light sm:text-5xl">Notificaciones</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Cuándo avisar y qué decir. Los recordatorios se encolan solos con cada turno; desde acá
          controlás el momento y el texto. El envío automático se activa cuando se conecte el canal
          de WhatsApp, pero los mensajes ya se usan hoy en los botones de cada turno.
        </p>
      </header>

      <NotificationsForm settings={settings} />
    </div>
  )
}
