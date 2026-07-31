import { NextResponse, type NextRequest } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { serverEnv } from '@/lib/env'

export const dynamic = 'force-dynamic'

/**
 * Tareas de mantenimiento. Lo invoca un cron (Supabase pg_cron, Vercel Cron o
 * cualquier scheduler) con el header:
 *
 *   Authorization: Bearer $CRON_SECRET
 *
 * Hace dos cosas:
 *  1. Libera los horarios de las reservas que nunca recibieron la seña.
 *  2. Devuelve los recordatorios vencidos, listos para que el canal de envío
 *     los consuma. El envío en sí todavía no está conectado: cuando se sume
 *     WhatsApp o email, se implementa acá y se llama a mark_reminder_sent().
 *     Ninguna otra parte del sistema cambia.
 */
export async function POST(request: NextRequest) {
  const authorization = request.headers.get('authorization')

  if (authorization !== `Bearer ${serverEnv.cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: expired, error: expireError } = await supabase.rpc('expire_pending_appointments')

  if (expireError) {
    return NextResponse.json({ error: expireError.message }, { status: 500 })
  }

  const { data: dueReminders, error: remindersError } = await supabase.rpc('get_due_reminders', {
    p_limit: 100,
  })

  if (remindersError) {
    return NextResponse.json({ error: remindersError.message }, { status: 500 })
  }

  return NextResponse.json({
    expiredAppointments: expired ?? 0,
    pendingReminders: dueReminders?.length ?? 0,
  })
}
