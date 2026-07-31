'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { signOutAction } from '@/lib/actions/auth'
import { ROUTES } from '@/lib/constants'

const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/calendario', label: 'Calendario' },
  { href: '/admin/turnos', label: 'Turnos' },
  { href: '/admin/clientes', label: 'Clientes' },
  { href: '/admin/servicios', label: 'Servicios' },
  { href: '/admin/horarios', label: 'Horarios' },
  { href: '/admin/configuracion', label: 'Configuración' },
  { href: '/admin/notificaciones', label: 'Notificaciones' },
  { href: '/admin/diagnostico', label: 'Diagnóstico' },
] as const

export function AdminNav({ businessName }: { businessName: string }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Panel de administración"
      className="flex flex-col gap-1 lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)]"
    >
      <Link href="/admin" className="mb-5 hidden font-display text-xl lg:block">
        {businessName || 'Panel'}
      </Link>

      {/* En mobile la navegación es una fila que scrollea; en desktop, columna. */}
      <ul className="-mx-5 flex gap-1 overflow-x-auto px-5 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {LINKS.map((link) => {
          const isActive =
            link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href)

          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                aria-current={isActive ? 'page' : undefined}
                className={`block whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors duration-200 lg:rounded-xl ${
                  isActive ? 'bg-accent text-white' : 'text-muted hover:bg-accent-soft hover:text-ink'
                }`}
              >
                {link.label}
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="mt-auto hidden flex-col gap-1 pt-6 lg:flex">
        <Link href={ROUTES.home} className="px-4 py-2 text-sm text-muted hover:text-ink">
          Ver el sitio
        </Link>
        <Link href={ROUTES.account} className="px-4 py-2 text-sm text-muted hover:text-ink">
          Mi cuenta
        </Link>
        <form action={signOutAction}>
          <button type="submit" className="px-4 py-2 text-sm text-muted hover:text-ink">
            Cerrar sesión
          </button>
        </form>
      </div>
    </nav>
  )
}
