import type { Metadata } from 'next'

import { requireAdmin } from '@/lib/services/admin/guard'
import { getBusinessSettings } from '@/lib/services/settings'
import { AdminNav } from '@/components/admin/AdminNav'

export const metadata: Metadata = { title: 'Panel', robots: { index: false, follow: false } }

// El panel siempre muestra el estado real de la agenda.
export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Segunda capa de control: el middleware ya filtró, RLS es la tercera.
  await requireAdmin()

  const settings = await getBusinessSettings()

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[190px_1fr] lg:gap-10">
      <AdminNav businessName={settings.name} />
      <main className="min-w-0 pb-16">{children}</main>
    </div>
  )
}
