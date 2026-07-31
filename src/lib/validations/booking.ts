import { z } from 'zod'

const uuid = z.string().uuid('Identificador inválido.')

const isoDateTime = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)$/))

export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida.')

export const bookingSchema = z.object({
  serviceId: uuid,
  startsAt: isoDateTime,
  notes: z
    .string()
    .trim()
    .max(500, 'El comentario no puede superar los 500 caracteres.')
    .optional()
    .default(''),
  depositAccepted: z
    .string()
    .refine((value) => value === 'true', 'Tenés que aceptar las condiciones de la seña.'),
})

export const cancelSchema = z.object({
  appointmentId: uuid,
  reason: z.string().trim().max(500).optional().default(''),
})

export const rescheduleSchema = z.object({
  appointmentId: uuid,
  startsAt: isoDateTime,
})

export type BookingInput = z.infer<typeof bookingSchema>
