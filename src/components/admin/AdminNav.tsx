'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { signOutAction } from '@/lib/actions/auth'
import { ROUTES } from '@/lib/constants'

export type AdminLink = { href: string; label: string; icon: string }

/**
 * Las cuatro primeras son las de uso diario y ocupan la barra inferior en
 * celular. El resto vive en la hoja "Más": son pantallas de configuración,
 * que se visitan de vez en cuando y no merecen un lugar permanente.
 */
export const ADMIN_LINKS: AdminLink[] = [
  { href: '/admin', label: 'Inicio', icon: '◈' },
  { href: '/admin/calendario', label: 'Agenda', icon: '▦' },
  { href: '/admin/turnos', label: 'Turnos', icon: '☰' },
  { href: '/admin/clientes', label: 'Clientes', icon: '◍' },
]

export const ADMIN_LINKS_SECUNDARIOS: AdminLink[] = [
  { href: '/admin/servicios', label: 'Servicios', icon: '✦' },
  { href: '/admin/horarios', label: 'Horarios', icon: '◷' },
  { href: '/admin/configuracion', label: 'Configuración', icon: '⚙' },
  { href: '/admin/notificaciones', label: 'Notificaciones', icon: '◔' },
  { href: '/admin/diagnostico', label: 'Diagnóstico', icon: '◎' },
]

const TODOS = [...ADMIN_LINKS, ...ADMIN_LINKS_SECUNDARIOS]

function esActiva(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
}

/** Título de la pantalla actual, para el encabezado de celular. */
export function useTituloAdmin() {
  const pathname = usePathname()
  return TODOS.find((link) => esActiva(pathname, link.href))?.label ?? 'Panel'
}

/* -------------------------------------------------------------------------
 * Escritorio: columna lateral
 * ---------------------------------------------------------------------- */

export function AdminSidebar({ businessName }: { businessName: string }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Panel de administración"
      className="sticky top-6 hidden h-[calc(100dvh-3rem)] min-w-0 flex-col gap-1 lg:flex"
    >
      <Link href="/admin" className="mb-6 block truncate font-display text-2xl font-light">
        {businessName || 'Panel'}
      </Link>

      <ul className="flex flex-col gap-0.5">
        {TODOS.map((link) => {
          const activa = esActiva(pathname, link.href)

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={activa ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-[var(--radius-soft)] px-3.5 py-2.5 text-sm transition-colors duration-300 ${
                  activa
                    ? 'bg-accent-soft text-accent-ink'
                    : 'text-muted hover:bg-veil hover:text-ink'
                }`}
              >
                <span aria-hidden className="w-4 text-center opacity-70">
                  {link.icon}
                </span>
                <span className="truncate">{link.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-line pt-4">
        <Link
          href={ROUTES.home}
          className="rounded-[var(--radius-soft)] px-3.5 py-2 text-sm text-muted transition-colors duration-300 hover:text-ink"
        >
          Ver el sitio
        </Link>
        <Link
          href={ROUTES.account}
          className="rounded-[var(--radius-soft)] px-3.5 py-2 text-sm text-muted transition-colors duration-300 hover:text-ink"
        >
          Mi cuenta
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-[var(--radius-soft)] px-3.5 py-2 text-left text-sm text-muted transition-colors duration-300 hover:text-ink"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </nav>
  )
}

/* -------------------------------------------------------------------------
 * Celular: barra inferior
 * ---------------------------------------------------------------------- */

/**
 * Barra fija abajo, como una aplicación nativa.
 *
 * En una pantalla de celular sostenida con una mano, el borde inferior es la
 * zona más cómoda del alcance del pulgar; el superior es la menos. Por eso la
 * navegación que se usa todo el día va abajo y no arriba.
 *
 * `pb-[env(safe-area-inset-bottom)]` respeta la barra de gestos del iPhone:
 * sin eso, el último ítem queda debajo del indicador del sistema.
 */
export function AdminTabBar() {
  const pathname = usePathname()
  const [masAbierto, setMasAbierto] = useState(false)

  useEffect(() => {
    setMasAbierto(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = masAbierto ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [masAbierto])

  const enSecundaria = ADMIN_LINKS_SECUNDARIOS.some((link) => esActiva(pathname, link.href))

  return (
    <>
      <AnimatePresence>
        {masAbierto && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setMasAbierto(false)}
              className="fixed inset-0 z-40 bg-ink/25 backdrop-blur-sm lg:hidden"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] bg-surface pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-2 shadow-lifted lg:hidden"
            >
              <span
                aria-hidden
                className="mx-auto mb-4 block h-1 w-10 rounded-full bg-line"
              />

              <ul className="px-3">
                {ADMIN_LINKS_SECUNDARIOS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`flex items-center gap-4 rounded-[var(--radius-soft)] px-4 py-3.5 transition-colors duration-200 ${
                        esActiva(pathname, link.href) ? 'text-accent' : 'text-ink'
                      }`}
                    >
                      <span aria-hidden className="w-5 text-center opacity-60">
                        {link.icon}
                      </span>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-2 border-t border-line px-3 pt-2">
                <Link
                  href={ROUTES.home}
                  className="block rounded-[var(--radius-soft)] px-4 py-3 text-sm text-muted"
                >
                  Ver el sitio
                </Link>
                <Link
                  href={ROUTES.account}
                  className="block rounded-[var(--radius-soft)] px-4 py-3 text-sm text-muted"
                >
                  Mi cuenta
                </Link>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="w-full rounded-[var(--radius-soft)] px-4 py-3 text-left text-sm text-muted"
                  >
                    Cerrar sesión
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav
        aria-label="Panel de administración"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <ul className="flex items-stretch">
          {ADMIN_LINKS.map((link) => {
            const activa = esActiva(pathname, link.href)

            return (
              <li key={link.href} className="flex-1">
                <Link
                  href={link.href}
                  aria-current={activa ? 'page' : undefined}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[10px] transition-colors duration-300 ${
                    activa ? 'text-accent' : 'text-muted'
                  }`}
                >
                  <span aria-hidden className="text-base leading-none">
                    {link.icon}
                  </span>
                  {link.label}
                </Link>
              </li>
            )
          })}

          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMasAbierto(true)}
              aria-expanded={masAbierto}
              className={`flex w-full flex-col items-center gap-1 py-2.5 text-[10px] transition-colors duration-300 ${
                enSecundaria ? 'text-accent' : 'text-muted'
              }`}
            >
              <span aria-hidden className="text-base leading-none">
                ⋯
              </span>
              Más
            </button>
          </li>
        </ul>
      </nav>
    </>
  )
}
