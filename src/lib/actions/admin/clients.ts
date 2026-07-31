'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { noteSchema } from '@/lib/validations/admin'
import { profileSchema } from '@/lib/validations/account'
import { toFieldErrors, type ActionResult, type FormState } from '@/lib/actions/types'
import { toUserMessage } from '@/utils/errors'

/** Observación privada. Solo la ve el negocio: RLS deja fuera al cliente. */
export async function addClientNoteAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = noteSchema.safeParse({
    clientId: formData.get('clientId'),
    appointmentId: formData.get('appointmentId') || null,
    body: formData.get('body'),
  })

  if (!parsed.success) {
    return { status: 'error', fieldErrors: toFieldErrors(parsed.error.issues) }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from('internal_notes').insert({
    client_id: parsed.data.clientId,
    appointment_id: parsed.data.appointmentId ?? null,
    body: parsed.data.body,
    author_id: user?.id ?? null,
  })

  if (error) {
    return { status: 'error', error: toUserMessage(error, 'addClientNote') }
  }

  revalidatePath(`/admin/clientes/${parsed.data.clientId}`)
  return { status: 'success', message: 'Observación guardada.' }
}

export async function deleteClientNoteAction(
  noteId: string,
  clientId: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('internal_notes').delete().eq('id', noteId)

  if (error) {
    return { ok: false, error: toUserMessage(error, 'deleteClientNote') }
  }

  revalidatePath(`/admin/clientes/${clientId}`)
  return { ok: true }
}

/** Editar los datos de contacto de un cliente desde su ficha. */
export async function updateClientAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const clientId = String(formData.get('clientId') ?? '')
  const parsed = profileSchema.safeParse({
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
  })

  if (!parsed.success) {
    return { status: 'error', fieldErrors: toFieldErrors(parsed.error.issues) }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('clients')
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone })
    .eq('id', clientId)

  if (error) {
    return { status: 'error', error: toUserMessage(error, 'updateClient') }
  }

  revalidatePath(`/admin/clientes/${clientId}`)
  return { status: 'success', message: 'Datos actualizados.' }
}
