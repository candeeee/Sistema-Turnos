'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { publicEnv } from '@/lib/env'
import { ROUTES } from '@/lib/constants'
import { signInSchema, signUpSchema } from '@/lib/validations/auth'
import { toFieldErrors, type FormState } from '@/lib/actions/types'

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    redirect: formData.get('redirect') || undefined,
  })

  if (!parsed.success) {
    return { status: 'error', fieldErrors: toFieldErrors(parsed.error.issues) }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    // Mensaje genérico a propósito: distinguir "email inexistente" de
    // "contraseña incorrecta" le confirma a un atacante qué cuentas existen.
    return { status: 'error', error: 'Email o contraseña incorrectos.' }
  }

  const { data: isAdmin } = await supabase.rpc('is_admin')

  revalidatePath('/', 'layout')
  redirect(parsed.data.redirect ?? (isAdmin ? ROUTES.admin : ROUTES.appointments))
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { status: 'error', fieldErrors: toFieldErrors(parsed.error.issues) }
  }

  const supabase = await createClient()

  // El nombre y el teléfono viajan en la metadata y el trigger
  // handle_new_user() los usa para crear la ficha del cliente.
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, phone: parsed.data.phone },
      emailRedirectTo: `${publicEnv.siteUrl}/auth/callback`,
    },
  })

  if (error) {
    return {
      status: 'error',
      error:
        error.code === 'user_already_exists'
          ? 'Ya existe una cuenta con ese email. Iniciá sesión.'
          : 'No pudimos crear la cuenta. Probá de nuevo en unos minutos.',
    }
  }

  // Con confirmación de email activada no hay sesión todavía.
  if (!data.session) {
    return {
      status: 'success',
      message: 'Te mandamos un email para confirmar tu cuenta. Revisá tu bandeja de entrada.',
    }
  }

  revalidatePath('/', 'layout')
  redirect(ROUTES.appointments)
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  revalidatePath('/', 'layout')
  redirect(ROUTES.home)
}
