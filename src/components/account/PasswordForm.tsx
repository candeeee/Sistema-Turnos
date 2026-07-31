'use client'

import { useActionState } from 'react'

import { updatePasswordAction } from '@/lib/actions/account'
import { IDLE_STATE } from '@/lib/actions/types'
import { Field } from '@/components/ui/Field'
import { FormAlert } from '@/components/ui/FormAlert'
import { SubmitButton } from '@/components/ui/Button'

export function PasswordForm() {
  const [state, formAction] = useActionState(updatePasswordAction, IDLE_STATE)

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.status === 'success' && state.message && (
        <FormAlert tone="success">{state.message}</FormAlert>
      )}
      {state.error && <FormAlert tone="error">{state.error}</FormAlert>}

      <Field
        label="Contraseña nueva"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="Mínimo 8 caracteres."
        required
        error={state.fieldErrors?.password}
      />

      <Field
        label="Repetir contraseña"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirm}
      />

      <SubmitButton pendingLabel="Guardando…" variant="secondary" className="w-fit">
        Cambiar contraseña
      </SubmitButton>
    </form>
  )
}
