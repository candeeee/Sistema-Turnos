'use client'

import { useActionState } from 'react'

import { updateProfileAction } from '@/lib/actions/account'
import { IDLE_STATE } from '@/lib/actions/types'
import { Field } from '@/components/ui/Field'
import { FormAlert } from '@/components/ui/FormAlert'
import { SubmitButton } from '@/components/ui/Button'

export function ProfileForm({ fullName, phone }: { fullName: string; phone: string }) {
  const [state, formAction] = useActionState(updateProfileAction, IDLE_STATE)

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.status === 'success' && state.message && (
        <FormAlert tone="success">{state.message}</FormAlert>
      )}
      {state.error && <FormAlert tone="error">{state.error}</FormAlert>}

      <Field
        label="Nombre y apellido"
        name="fullName"
        defaultValue={fullName}
        autoComplete="name"
        required
        error={state.fieldErrors?.fullName}
      />

      <Field
        label="Teléfono"
        name="phone"
        type="tel"
        inputMode="tel"
        defaultValue={phone}
        autoComplete="tel"
        hint="Lo usamos para avisarte si hay algún cambio con tu turno."
        required
        error={state.fieldErrors?.phone}
      />

      <SubmitButton pendingLabel="Guardando…" variant="secondary" className="w-fit">
        Guardar cambios
      </SubmitButton>
    </form>
  )
}
