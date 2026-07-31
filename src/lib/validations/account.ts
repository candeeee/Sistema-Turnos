import { z } from 'zod'

import { passwordSchema } from '@/lib/validations/auth'

export const profileSchema = z.object({
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
})

export const passwordChangeSchema = z
  .object({
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirm'],
  })
