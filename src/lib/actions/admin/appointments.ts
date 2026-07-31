'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { statusSchema } from '@/lib/validations/admin'
import type { ActionResult } from '@/lib/actions/types'
import { toUserMessage } from '@/utils/errors'
import type { AppointmentStatus } from '@/types/domain'

const ADMIN_PATHS = ['/admin', '/admin/turnos', '/admin/calendario', '/admin/clientes']

function revalidateAdmin() {
  for (const path of ADMIN_PATHS) revalidatePath(path)
}

/**
 * Cambio de estado desde el panel.
 *
 * La regla de que un estado terminal no vuelve atrás la aplica un trigger de
 * la base, no esta función: el panel no es el único camino posible hacia esa
 * tabla y la garantía tiene que estar donde están los datos.
 */
export async function updateAppointmentStatusAction(
  appointmentId: string,
  status: AppointmentStatus,
  reason = '',
): Promise<ActionResult> {
  const parsed = statusSchema.safeParse({ appointmentId, status, reason })

  if (!parsed.success) {
    return { ok: false, error: 'Ese cambio de estado no es válido.' }
  }

  const isCancellation = status.startsWith('cancelled')

  const supabase = await createClient()
  const { error } = await supabase
    .from('appointments')
    .update({
      status: parsed.data.status,
      ...(isCancellation && parsed.data.reason
        ? { cancellation_reason: parsed.data.reason }
        : {}),
    })
    .eq('id', parsed.data.appointmentId)

  if (error) {
    return { ok: false, error: toUserMessage(error, 'updateAppointmentStatus') }
  }

  revalidateAdmin()
  return { ok: true }
}

/**
 * Mover un turno desde el panel.
 *
 * Se actualiza `starts_at` directamente: un trigger recalcula `ends_at` y el
 * constraint de exclusión rechaza el cambio si pisa otro turno. El negocio no
 * está atado a la ventana de anticipación que sí limita al cliente.
 */
export async function moveAppointmentAction(
  appointmentId: string,
  startsAt: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('appointments')
    .update({ starts_at: startsAt })
    .eq('id', appointmentId)

  if (error) {
    if (error.code === '23P01') {
      return { ok: false, error: 'Ese horario se superpone con otro turno activo.' }
    }
    return { ok: false, error: toUserMessage(error, 'moveAppointment') }
  }

  revalidateAdmin()
  return { ok: true }
}
