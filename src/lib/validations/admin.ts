import { z } from 'zod'

const money = z.coerce.number().min(0, 'El precio no puede ser negativo.').max(99_999_999)
const time = z.string().regex(/^\d{2}:\d{2}$/, 'Usá el formato HH:MM.')

export const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, 'Escribí el nombre del servicio.').max(120),
  description: z.string().trim().max(1000).optional().default(''),
  durationMin: z.coerce
    .number()
    .int()
    .min(5, 'La duración mínima es de 5 minutos.')
    .max(600, 'La duración máxima es de 10 horas.'),
  bufferMin: z.coerce.number().int().min(0).max(240).optional().default(0),
  price: money,
  imagePath: z.string().trim().max(400).optional().nullable(),
  isActive: z.coerce.boolean().optional().default(true),
  isFeatured: z.coerce.boolean().optional().default(false),
  sortOrder: z.coerce.number().int().min(0).max(999).optional().default(0),
})

export const businessHourSchema = z
  .object({
    id: z.string().uuid().optional(),
    weekday: z.coerce.number().int().min(0).max(6),
    opensAt: time,
    closesAt: time,
  })
  .refine((value) => value.closesAt > value.opensAt, {
    message: 'El cierre tiene que ser posterior a la apertura.',
    path: ['closesAt'],
  })

export const exceptionSchema = z
  .object({
    type: z.enum(['holiday', 'vacation', 'block']),
    startsAt: z.string().min(1, 'Elegí desde cuándo.'),
    endsAt: z.string().min(1, 'Elegí hasta cuándo.'),
    reason: z.string().trim().max(200).optional().default(''),
  })
  .refine((value) => new Date(value.endsAt) > new Date(value.startsAt), {
    message: 'El final tiene que ser posterior al inicio.',
    path: ['endsAt'],
  })

export const settingsSchema = z.object({
  name: z.string().trim().max(120).optional().default(''),
  phone: z.string().trim().max(30).optional().default(''),
  whatsapp: z.string().trim().max(30).optional().default(''),
  email: z.string().trim().max(160).optional().default(''),
  address: z.string().trim().max(240).optional().default(''),
  mapsUrl: z.string().trim().url('Pegá un link válido.').max(500).optional().or(z.literal('')),
  instagram: z.string().trim().max(60).optional().default(''),
  facebook: z.string().trim().max(60).optional().default(''),

  slotIntervalMin: z.coerce.number().int().min(5).max(120),
  minHoursBeforeBooking: z.coerce.number().int().min(0).max(720),
  maxDaysAhead: z.coerce.number().int().min(1).max(365),
  minHoursBeforeCancel: z.coerce.number().int().min(0).max(720),
  holdHours: z.coerce.number().int().min(1).max(720),
  reminderHoursBefore: z.coerce.number().int().min(1).max(168),
  remindersEnabled: z.coerce.boolean().optional().default(false),

  // Se valida contra la lista real de zonas del sistema en la base
  // (trigger business_settings_validate); acá solo se comprueba el formato.
  timezone: z
    .string()
    .trim()
    .min(3, 'Elegí una zona horaria.')
    .regex(/^[A-Za-z]+\/[A-Za-z_+\-0-9\/]+$/, 'La zona horaria no tiene un formato válido.'),

  depositPercentage: z.coerce
    .number()
    .min(0, 'El porcentaje no puede ser negativo.')
    .max(100, 'El porcentaje no puede superar 100.'),
  depositAlias: z.string().trim().max(60).optional().default(''),
  depositCbu: z.string().trim().max(40).optional().default(''),
  depositInstructions: z.string().trim().max(600).optional().default(''),
  bookingNotice: z.string().trim().max(600).optional().default(''),
  cancellationPolicy: z.string().trim().max(1000).optional().default(''),
})

export const noteSchema = z.object({
  clientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional().nullable(),
  body: z.string().trim().min(1, 'Escribí la observación.').max(2000),
})

export const statusSchema = z.object({
  appointmentId: z.string().uuid(),
  status: z.enum([
    'pending_confirmation',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled_by_client',
    'cancelled_by_business',
    'rescheduled',
    'no_show',
  ]),
  reason: z.string().trim().max(500).optional().default(''),
})

export const notificationsSchema = z.object({
  remindersEnabled: z.coerce.boolean().optional().default(false),
  reminderHoursBefore: z.coerce.number().int().min(1).max(168),
  secondReminderEnabled: z.coerce.boolean().optional().default(false),
  secondReminderHours: z.coerce.number().int().min(1).max(72),
  messageReminder: z.string().trim().max(800).optional().default(''),
  messageConfirmation: z.string().trim().max(800).optional().default(''),
  messageCancellation: z.string().trim().max(800).optional().default(''),
  messageStatusChange: z.string().trim().max(800).optional().default(''),
})
