/**
 * Avatar por iniciales.
 *
 * Sin foto todavía: el tono de fondo se deriva del propio nombre, así que cada
 * persona tiene siempre el mismo color y dos clientes distintos rara vez
 * comparten el suyo. Todos los tonos salen de la paleta del producto, con
 * saturación baja, para que un listado de veinte clientes no se convierta en
 * un semáforo.
 */
const TONES = [
  'var(--color-accent)',
  'var(--color-status-rescheduled)',
  'var(--color-status-progress)',
  'var(--color-status-confirmed)',
  'var(--color-status-pending)',
] as const

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '·'

  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''

  return (first + last).toUpperCase()
}

function toneFor(name: string): string {
  const sum = [...name].reduce((total, char) => total + char.charCodeAt(0), 0)
  return TONES[sum % TONES.length] ?? TONES[0]
}

export function Avatar({
  name,
  size = 36,
}: {
  name: string
  size?: number
}) {
  const tone = toneFor(name)

  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-medium"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        color: tone,
        backgroundColor: `color-mix(in srgb, ${tone} 16%, transparent)`,
        letterSpacing: '0.02em',
      }}
    >
      {initials(name)}
    </span>
  )
}
