'use client'

import { useFormStatus } from 'react-dom'
import type { ComponentProps, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-white shadow-soft hover:bg-accent-hover hover:shadow-lifted disabled:bg-muted disabled:shadow-none',
  secondary: 'bg-surface text-ink border border-line hover:border-ink/40 hover:bg-veil/60',
  ghost: 'text-muted hover:bg-accent-soft hover:text-accent-ink',
}

/**
 * La escala al presionar es de 0.98: apenas perceptible, pero es lo que hace
 * que un botón se sienta físico en celular. Más que eso se lee como rebote.
 */
const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium ' +
  'transition-all duration-300 ease-[var(--ease-soft)] active:scale-[0.98] ' +
  'disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100'

type ButtonProps = ComponentProps<'button'> & {
  variant?: Variant
  children: ReactNode
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <button className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

/**
 * Botón de envío que se deshabilita solo mientras corre la Server Action.
 * Evita el doble submit sin estado manual en cada formulario.
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = 'primary',
  className = '',
}: {
  children: ReactNode
  pendingLabel: string
  variant?: Variant
  className?: string
}) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant={variant} disabled={pending} className={className}>
      {pending && (
        <span
          aria-hidden
          className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent"
        />
      )}
      {pending ? pendingLabel : children}
    </Button>
  )
}
