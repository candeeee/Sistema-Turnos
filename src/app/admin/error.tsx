'use client'

import Link from 'next/link'
import { useEffect } from 'react'

/**
 * Límite de error del panel. A diferencia del público, acá sí conviene mostrar
 * el detalle técnico y el atajo al diagnóstico: quien lo ve es quien administra
 * el sistema.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // El primer argumento va como texto: el overlay de Next muestra un
    // objeto suelto como `{}` y el mensaje se pierde justo cuando hace falta.
    console.error(`\n✖ [boundary:admin] ${error.message}`, {
      boundary: 'admin',
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      at: new Date().toISOString(),
    })
  }, [error])

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-status-cancelled">Error en el panel</p>
        <h1 className="mt-3 font-display text-3xl">No pudimos cargar esta pantalla</h1>
      </header>

      <pre className="overflow-x-auto whitespace-pre-wrap rounded-[var(--radius-card)] border border-line bg-surface p-5 text-sm">
        {error.message}
      </pre>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-accent-hover"
        >
          Reintentar
        </button>
        <Link
          href="/admin/diagnostico"
          className="rounded-full border border-line bg-surface px-6 py-3 text-sm transition-colors duration-200 hover:border-ink"
        >
          Ver diagnóstico
        </Link>
      </div>

      <p className="text-sm text-muted">
        El detalle completo del error, con su código de PostgreSQL, está en la terminal donde corre
        el servidor.
      </p>
    </div>
  )
}
