import Link from 'next/link'

export function StatCard({
  label,
  value,
  hint,
  href,
  tone = 'default',
  index = 0,
}: {
  label: string
  value: number | string
  hint?: string
  href?: string
  tone?: 'default' | 'alert'
  index?: number
}) {
  const content = (
    <>
      <p className="truncate text-[10px] uppercase tracking-[0.15em] text-muted sm:text-xs">
        {label}
      </p>
      <p
        className="tnum mt-2 font-display text-3xl font-light sm:mt-3 sm:text-4xl"
        style={tone === 'alert' ? { color: 'var(--color-status-pending)' } : undefined}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] leading-snug text-muted">{hint}</p>}
    </>
  )

  const className =
    'animate-rise block min-w-0 rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-soft transition-all duration-300 ease-[var(--ease-soft)] sm:p-5'

  return href ? (
    <Link
      href={href}
      className={`${className} hover:-translate-y-0.5 hover:border-ink`}
      style={{ '--delay': `${index * 60}ms` } as React.CSSProperties}
    >
      {content}
    </Link>
  ) : (
    <div className={className} style={{ '--delay': `${index * 60}ms` } as React.CSSProperties}>
      {content}
    </div>
  )
}
