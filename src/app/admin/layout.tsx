import type { Metadata } from 'next'

import { requireAdmin } from '@/lib/services/admin/guard'
import { getBusinessSettings } from '@/lib/services/settings'
import { AdminSidebar, AdminTabBar } from '@/components/admin/AdminNav'
import { AdminTopBar } from '@/components/admin/AdminTopBar'

export const metadata: Metadata = { title: 'Panel', robots: { index: false, follow: false } }

// El panel siempre muestra el estado real de la agenda.
export const dynamic = 'force-dynamic'

/**
 * Estructura del panel.
 *
 * En celular: barra superior con el nombre de la pantalla y barra inferior de
 * navegación, como una aplicación nativa. El contenido lleva `pb-24` para no
 * quedar tapado por la barra inferior.
 *
 * En escritorio (lg): columna lateral fija y contenido al lado.
 *
 * `min-w-0` en el contenedor y en el `main` es lo que impide el desborde
 * horizontal: por defecto, un elemento de grilla o de flex tiene
 * `min-width: auto` y se niega a encogerse por debajo del ancho de su
 * contenido. Una sola tabla ancha adentro estira toda la página.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Segunda capa de control: el middleware ya filtró, RLS es la tercera.
  await requireAdmin()

  const settings = await getBusinessSettings()

  return (
    <div className="min-h-dvh">
      <AdminTopBar businessName={settings.name} />

      <div className="mx-auto grid min-w-0 max-w-7xl gap-10 px-4 pb-24 pt-4 sm:px-6 lg:grid-cols-[210px_minmax(0,1fr)] lg:px-8 lg:pb-12 lg:pt-6">
        <AdminSidebar businessName={settings.name} />

        <main className="min-w-0">{children}</main>
      </div>

      <AdminTabBar />
    </div>
  )
}
