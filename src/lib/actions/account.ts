'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { passwordChangeSchema, profileSchema } from '@/lib/validations/account'
import { toFieldErrors, type FormState } from '@/lib/actions/types'
import { toUserMessage } from '@/utils/errors'
import { logError } from '@/utils/log'
import { ROUTES } from '@/lib/constants'

/**
 * Actualiza la ficha del usuario. RLS limita la operación a su propia fila y
 * un trigger impide que se reasigne a otra cuenta: acá no hace falta —ni
 * serviría— filtrar por id desde el cliente.
 */
export async function updateProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = profileSchema.safeParse({
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
  })

  if (!parsed.success) {
    return { status: 'error', fieldErrors: toFieldErrors(parsed.error.issues) }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { status: 'error', error: 'Tu sesión venció. Volvé a iniciar sesión.' }
  }

  const { error } = await supabase
    .from('clients')
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone })
    .eq('user_id', user.id)

  if (error) {
    return { status: 'error', error: toUserMessage(error, 'updateProfile') }
  }

  revalidatePath(ROUTES.account)
  return { status: 'success', message: 'Listo, actualizamos tus datos.' }
}

/**
 * Cambio de contraseña con la sesión ya iniciada.
 *
 * Supabase valida el token de sesión antes de aplicar el cambio, así que no
 * hace falta —ni serviría— pedir la contraseña anterior desde el formulario:
 * quien tiene la sesión activa es la persona dueña de la cuenta.
 */
export async function updatePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = passwordChangeSchema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  })

  if (!parsed.success) {
    return { status: 'error', fieldErrors: toFieldErrors(parsed.error.issues) }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })

  if (error) {
    logError('updatePassword', error)
    return {
      status: 'error',
      error:
        error.message === 'New password should be different from the old password.'
          ? 'La contraseña nueva tiene que ser distinta de la actual.'
          : 'No pudimos actualizar la contraseña. Probá de nuevo en unos minutos.',
    }
  }

  return { status: 'success', message: 'Contraseña actualizada.' }
}
