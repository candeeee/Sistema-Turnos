'use client'

import Link from 'next/link'

import { useTituloAdmin } from '@/components/admin/AdminNav'
import { ROUTES } from '@/lib/constants'

/**
 * Encabezado de celular.
 *
 * Con la navegación abajo, arriba solo queda decir dónde estás. El nombre del
 * negocio va en pequeño y el de la pantalla en grande: es la jerarquía inversa
 * a la de un sitio web, y la correcta para una herramienta de trabajo, donde
 * la marca ya se da por sabida.
 */
export function AdminTopBar({ businessName }: { businessName: string }) {
  const titulo = useTituloAdmin()

  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/85 backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] uppercase tracking-[0.18em] text-muted">
            {businessName || 'Panel'}
          </p>
          <h2 className="truncate font-display text-xl font-light leading-tight">{titulo}</h2>
        </div>

        <Link
          href={ROUTES.home}
          className="shrink-0 rounded-full border border-line px-3.5 py-1.5 text-xs text-muted transition-colors duration-300 hover:text-ink"
        >
          Ver sitio
        </Link>
      </div>
    </header>
  )
}
