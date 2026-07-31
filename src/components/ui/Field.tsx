import type { ComponentProps } from 'react'

type FieldProps = ComponentProps<'input'> & {
  label: string
  name: string
  error?: string
  hint?: string
}

export function Field({ label, name, error, hint, className = '', ...props }: FieldProps) {
  const errorId = `${name}-error`
  const hintId = `${name}-hint`

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="text-[13px] font-medium tracking-wide text-ink">
        {label}
      </label>

      <input
        id={name}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`w-full rounded-[var(--radius-soft)] border bg-veil/40 px-4 py-3.5 text-ink
          transition-all duration-300 placeholder:text-muted/70
          focus:bg-surface focus:outline-none focus-visible:outline-none
          ${
            error
              ? 'border-status-cancelled focus:border-status-cancelled'
              : 'border-transparent focus:border-accent/60 focus:shadow-soft'
          } ${className}`}
        {...props}
      />

      {hint && !error && (
        <p id={hintId} className="text-xs leading-relaxed text-muted">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className="text-xs text-status-cancelled">
          {error}
        </p>
      )}
    </div>
  )
}
