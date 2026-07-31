'use client'

import { useActionState } from 'react'

import { signUpAction } from '@/lib/actions/auth'
import { IDLE_STATE } from '@/lib/actions/types'
import { Field } from '@/components/ui/Field'
import { FormAlert } from '@/components/ui/FormAlert'
import { SubmitButton } from '@/components/ui/Button'

export function RegisterForm() {
  const [state, formAction] = useActionState(signUpAction, IDLE_STATE)

  if (state.status === 'success' && state.message) {
    return <FormAlert tone="success">{state.message}</FormAlert>
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.error && <FormAlert tone="error">{state.error}</FormAlert>}

      <Field
        label="Nombre y apellido"
        name="fullName"
        autoComplete="name"
        required
        error={state.fieldErrors?.fullName}
      />

      <Field
        label="Teléfono"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        hint="Lo usamos para avisarte si hay algún cambio con tu turno."
        required
        error={state.fieldErrors?.phone}
      />

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
        autoComplete="new-password"
        hint="Mínimo 8 caracteres."
        required
        error={state.fieldErrors?.password}
      />

      <SubmitButton pendingLabel="Creando tu cuenta…" className="mt-2 w-full">
        Crear cuenta
      </SubmitButton>
    </form>
  )
}
