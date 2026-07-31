export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-live="polite">
      <div>
        <div className="skeleton h-3 w-20" />
        <div className="skeleton mt-3 h-11 w-full max-w-64" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="skeleton h-32 rounded-[var(--radius-card)]" />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="skeleton h-20 rounded-[var(--radius-card)]" />
        ))}
      </div>

      <span className="sr-only">Cargando…</span>
    </div>
  )
}
