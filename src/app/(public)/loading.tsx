/**
 * Esqueleto de carga del sitio público.
 *
 * Reproduce la silueta real de la página —título grande, párrafo, botones y
 * una grilla de tarjetas— en vez de un spinner centrado. La percepción de
 * velocidad depende más de que el espacio ya esté ocupado que del tiempo real.
 */
export default function PublicLoading() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24" aria-busy="true">
      <div className="skeleton h-3 w-24" />
      <div className="skeleton mt-6 h-14 w-full max-w-2xl" />
      <div className="skeleton mt-3 h-14 w-2/3 max-w-lg" />

      <div className="mt-8 flex flex-col gap-2">
        <div className="skeleton h-4 w-full max-w-xl" />
        <div className="skeleton h-4 w-4/5 max-w-md" />
      </div>

      <div className="mt-10 flex gap-3">
        <div className="skeleton h-12 w-40 max-w-[45%] rounded-full" />
        <div className="skeleton h-12 w-32 max-w-[40%] rounded-full" />
      </div>

      <div className="mt-20 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="skeleton h-72 rounded-[var(--radius-card)]" />
        ))}
      </div>

      <span className="sr-only">Cargando…</span>
    </div>
  )
}
