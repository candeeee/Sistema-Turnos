export function FormAlert({ tone, children }: { tone: 'error' | 'success'; children: string }) {
  const styles =
    tone === 'error'
      ? 'border-status-cancelled/30 bg-status-cancelled/5 text-status-cancelled'
      : 'border-status-completed/30 bg-status-completed/5 text-status-completed'

  return (
    <p role="status" className={`animate-rise rounded-xl border px-4 py-3 text-sm ${styles}`}>
      {children}
    </p>
  )
}
