'use client'

import { useActionState } from 'react'

import { updateClientAction } from '@/lib/actions/admin/clients'
import { IDLE_STATE } from '@/lib/actions/types'
import { Field } from '@/components/ui/Field'
import { FormAlert } from '@/components/ui/FormAlert'
import { SubmitButton } from '@/components/ui/Button'

export function ClientEditForm({
  clientId,
  fullName,
  phone,
}: {
  clientId: string
  fullName: string
  phone: string
}) {
  const [state, formAction] = useActionState(updateClientAction, IDLE_STATE)

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.status === 'success' && state.message && (
        <FormAlert tone="success">{state.message}</FormAlert>
      )}
      {state.error && <FormAlert tone="error">{state.error}</FormAlert>}

      <input type="hidden" name="clientId" value={clientId} />

      <Field
        label="Nombre y apellido"
        name="fullName"
        defaultValue={fullName}
        required
        error={state.fieldErrors?.fullName}
      />
      <Field
        label="Teléfono"
        name="phone"
        type="tel"
        defaultValue={phone}
        required
        error={state.fieldErrors?.phone}
      />

      <SubmitButton pendingLabel="Guardando…" variant="secondary" className="w-fit">
        Guardar
      </SubmitButton>
    </form>
  )
}
