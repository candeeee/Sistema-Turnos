'use client'

import { useEffect } from 'react'

/**
 * Límite de error de toda la aplicación.
 *
 * Muestra el mensaje real —incluido el código de PostgreSQL cuando viene de la
 * base— en lugar de una pantalla en blanco. El objetivo es que quien administra
 * el sistema pueda decir qué falló sin abrir la consola.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // El primer argumento va como texto: el overlay de Next muestra un
    // objeto suelto como `{}` y el mensaje se pierde justo cuando hace falta.
    console.error(`\n✖ [boundary:app] ${error.message}`, {
      boundary: 'app',
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      at: new Date().toISOString(),
    })
  }, [error])

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-5 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-status-cancelled">Error</p>
      <h1 className="mt-4 font-display text-4xl leading-tight">Algo se rompió</h1>

      <p className="mt-4 rounded-[var(--radius-card)] border border-line bg-surface p-4 text-sm">
        {error.message}
      </p>

      {error.digest && (
        <p className="tnum mt-2 text-xs text-muted">Identificador del error: {error.digest}</p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-accent-hover"
        >
          Reintentar
        </button>
        <a
          href="/"
          className="rounded-full border border-line bg-surface px-6 py-3 text-sm transition-colors duration-200 hover:border-ink"
        >
          Volver al inicio
        </a>
      </div>
    </main>
  )
}
