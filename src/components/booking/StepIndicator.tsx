'use client'

export const BOOKING_STEPS = ['Servicio', 'Fecha', 'Horario', 'Datos'] as const

export type StepIndex = 0 | 1 | 2 | 3

/**
 * Los pasos están numerados porque acá el orden sí es información: no se puede
 * elegir horario sin fecha, ni fecha sin servicio.
 */
export function StepIndicator({
  current,
  onSelect,
}: {
  current: StepIndex
  onSelect: (step: StepIndex) => void
}) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      {BOOKING_STEPS.map((label, index) => {
        const isDone = index < current
        const isCurrent = index === current

        return (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => isDone && onSelect(index as StepIndex)}
              disabled={!isDone}
              aria-current={isCurrent ? 'step' : undefined}
              className={`tnum transition-colors duration-200 ${
                isCurrent
                  ? 'text-ink'
                  : isDone
                    ? 'text-accent hover:underline'
                    : 'text-muted'
              } ${isDone ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span className="mr-1.5">{String(index + 1).padStart(2, '0')}</span>
              {label}
            </button>

            {index < BOOKING_STEPS.length - 1 && (
              <span aria-hidden className="text-line">
                ·
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
