import { getBusinessSettings } from '@/lib/services/settings'
import { getSessionContext } from '@/lib/services/session'
import { getNavItems } from '@/lib/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

/**
 * La navegación se resuelve una sola vez, en el servidor, y baja ya calculada
 * al header. Ningún componente cliente vuelve a preguntarse qué mostrar.
 */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [settings, session] = await Promise.all([getBusinessSettings(), getSessionContext()])

  const items = getNavItems({
    isAuthenticated: session.isAuthenticated,
    isAdmin: session.isAdmin,
  })

  return (
    <div className="flex min-h-dvh flex-col">
      <Header
        businessName={settings.name}
        items={items}
        isAuthenticated={session.isAuthenticated}
        displayName={session.displayName}
      />

      <div className="flex-1">{children}</div>

      <Footer settings={settings} isAdmin={session.isAdmin} />
    </div>
  )
}
