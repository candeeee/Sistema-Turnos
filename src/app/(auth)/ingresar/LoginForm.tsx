'use client'

import { useActionState } from 'react'

import { signInAction } from '@/lib/actions/auth'
import { IDLE_STATE } from '@/lib/actions/types'
import { Field } from '@/components/ui/Field'
import { FormAlert } from '@/components/ui/FormAlert'
import { SubmitButton } from '@/components/ui/Button'

export function LoginForm({
  redirectTo,
  linkError,
}: {
  redirectTo?: string
  linkError?: string
}) {
  const [state, formAction] = useActionState(signInAction, IDLE_STATE)
  const error = state.error ?? linkError

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {error && <FormAlert tone="error">{error}</FormAlert>}

      {redirectTo && <input type="hidden" name="redirect" value={redirectTo} />}

      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={state.fieldErrors?.email}
      />

      <Field
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />

      <SubmitButton pendingLabel="Entrando…" className="mt-2 w-full">
        Entrar
      </SubmitButton>
    </form>
  )
}
