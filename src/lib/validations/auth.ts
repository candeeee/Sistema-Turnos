import { z } from 'zod'

/**
 * Esquemas compartidos entre el formulario y la Server Action. El navegador
 * valida para dar feedback rápido; el servidor valida de nuevo porque el
 * navegador siempre puede mentir.
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Escribí tu email.')
  .email('Ese email no parece válido.')

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña necesita al menos 8 caracteres.')
  .max(72, 'La contraseña no puede superar los 72 caracteres.')

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Escribí tu contraseña.'),
  redirect: z.string().startsWith('/').optional(),
})

export const signUpSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Escribí tu nombre y apellido.')
    .max(120, 'Ese nombre es demasiado largo.'),
  phone: z
    .string()
    .trim()
    .min(6, 'Escribí un teléfono de contacto.')
    .max(30, 'Ese teléfono es demasiado largo.')
    .regex(/^[\d\s+()-]+$/, 'El teléfono solo puede tener números, espacios y + ( ) -'),
  email: emailSchema,
  password: passwordSchema,
})

export type SignInInput = z.infer<typeof signInSchema>
export type SignUpInput = z.infer<typeof signUpSchema>
