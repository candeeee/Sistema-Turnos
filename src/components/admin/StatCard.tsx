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
      <p className="text-xs uppercase tracking-[0.15em] text-muted">{label}</p>
      <p
        className="tnum mt-3 text-4xl"
        style={tone === 'alert' ? { color: 'var(--color-status-pending)' } : undefined}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </>
  )

  const className =
    'animate-rise block rounded-[var(--radius-card)] border border-line bg-surface p-5 transition-all duration-200 ease-[var(--ease-soft)]'

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
