import Link from 'next/link'

import { getBusinessSettings } from '@/lib/services/settings'
import { ROUTES } from '@/lib/constants'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const settings = await getBusinessSettings()

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <Link
          href={ROUTES.home}
          className="mb-8 block text-center font-display text-2xl transition-opacity duration-200 hover:opacity-70"
        >
          {settings.name || 'Inicio'}
        </Link>

        <div className="animate-rise rounded-[var(--radius-card)] border border-line bg-surface p-7 shadow-[0_1px_2px_rgba(20,24,26,0.04)] sm:p-9">
          {children}
        </div>
      </div>
    </main>
  )
}
