import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-5 py-16">
      <p className="tnum text-xs uppercase tracking-[0.2em] text-muted">404</p>
      <h1 className="mt-4 font-display text-4xl leading-tight">Esta página no existe</h1>
      <p className="mt-4 text-muted">
        Puede que el link esté mal o que el contenido ya no esté disponible.
      </p>

      <Link
        href="/"
        className="mt-8 w-fit rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-accent-hover"
      >
        Volver al inicio
      </Link>
    </main>
  )
}
