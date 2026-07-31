import { getBusinessSettings } from '@/lib/services/settings'
import { SettingsForm } from '@/components/admin/SettingsForm'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const settings = await getBusinessSettings()

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-light sm:text-4xl lg:text-5xl">Configuración</h1>
        <p className="mt-1 text-sm text-muted">
          Todo lo que se muestra en el sitio sale de acá. La zona horaria del negocio es{' '}
          <span className="tnum">{settings.timezone}</span> y se cambia desde la base de datos.
        </p>
      </header>

      <SettingsForm settings={settings} />
    </div>
  )
}
