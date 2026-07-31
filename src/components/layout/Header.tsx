'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import type { NavItem } from '@/lib/navigation'
import { ROUTES } from '@/lib/constants'
import { signOutAction } from '@/lib/actions/auth'
import { Avatar } from '@/components/ui/Avatar'

/**
 * Barra superior.
 *
 * No decide qué mostrar: recibe los ítems ya resueltos por `lib/navigation`.
 * Esa separación es la que garantiza que el menú de escritorio y el de celular
 * digan siempre lo mismo.
 *
 * El indicador de la sección activa es una línea animada con `layoutId`, así
 * que se desliza entre ítems en lugar de aparecer y desaparecer.
 */
export function Header({
  businessName,
  items,
  isAuthenticated,
  displayName,
}: {
  businessName: string
  items: NavItem[]
  isAuthenticated: boolean
  displayName: string | null
}) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  // Navegar cierra el menú: sin esto queda abierto sobre la página nueva.
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // El menú abierto bloquea el scroll del fondo, como una hoja nativa.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const isActive = (href: string) =>
    href === ROUTES.home ? pathname === href : pathname.startsWith(href)

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5 sm:h-20 sm:px-8">
        <Link
          href={ROUTES.home}
          className="font-display text-2xl font-light tracking-wide transition-opacity duration-300 hover:opacity-60 sm:text-[1.7rem]"
        >
          {businessName || 'Turnos'}
        </Link>

        {/* Escritorio */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Navegación principal">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={`relative rounded-full px-4 py-2 text-sm transition-colors duration-300 ${
                isActive(item.href) ? 'text-ink' : 'text-muted hover:text-ink'
              }`}
            >
              {item.label}
              {isActive(item.href) && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-x-4 -bottom-0.5 h-px bg-accent"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
            </Link>
          ))}

          {isAuthenticated && displayName && (
            <Link
              href={ROUTES.account}
              aria-label="Mi cuenta"
              className="ml-2 transition-transform duration-300 hover:scale-105"
            >
              <Avatar name={displayName} />
            </Link>
          )}
        </nav>

        {/* Celular */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="menu-mobile"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          className="flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-300 hover:bg-accent-soft md:hidden"
        >
          <span className="relative block h-3 w-4">
            <motion.span
              className="absolute left-0 block h-px w-full bg-ink"
              animate={menuOpen ? { rotate: 45, top: 6 } : { rotate: 0, top: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.span
              className="absolute left-0 block h-px w-full bg-ink"
              animate={menuOpen ? { rotate: -45, top: 6 } : { rotate: 0, top: 12 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            />
          </span>
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            id="menu-mobile"
            aria-label="Navegación principal"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-line/70 bg-paper md:hidden"
          >
            <div className="px-5 pb-7 pt-3">
              {isAuthenticated && displayName && (
                <div className="mb-4 flex items-center gap-3 border-b border-line pb-4">
                  <Avatar name={displayName} size={44} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{displayName}</span>
                    <span className="block text-xs text-muted">Sesión iniciada</span>
                  </span>
                </div>
              )}

              <ul className="flex flex-col">
                {items.map((item, index) => (
                  <motion.li
                    key={item.href}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + index * 0.05, duration: 0.3 }}
                  >
                    <Link
                      href={item.href}
                      className={`block py-3.5 text-lg transition-colors duration-200 ${
                        isActive(item.href) ? 'text-accent' : 'text-ink'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </motion.li>
                ))}
              </ul>

              {isAuthenticated && (
                <form action={signOutAction} className="mt-4 border-t border-line pt-4">
                  <button
                    type="submit"
                    className="text-sm text-muted transition-colors duration-200 hover:text-ink"
                  >
                    Cerrar sesión
                  </button>
                </form>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
