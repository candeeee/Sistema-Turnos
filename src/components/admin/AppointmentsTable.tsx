'use client'

import { useState, useTransition } from 'react'

import type { AdminAppointment } from '@/lib/services/admin/appointments'
import {
  moveAppointmentAction,
  updateAppointmentStatusAction,
} from '@/lib/actions/admin/appointments'
import { APPOINTMENT_STATUS, APPOINTMENT_STATUSES } from '@/lib/constants'
import { formatDateLong, formatDateTime, formatDuration, formatPrice, formatTime } from '@/utils/format'
import { zoneOffset } from '@/utils/date'
import { renderTemplate, whatsappMessageLink } from '@/utils/templates'
import type { AppointmentStatus } from '@/types/domain'

/** Textos configurados en /admin/notificaciones. */
export type Messaging = {
  businessName: string
  alias: string
  confirmation: string
  reminder: string
  cancellation: string
  statusChange: string
}

import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { FormAlert } from '@/components/ui/FormAlert'

/** "2026-08-03T14:30" del input local → instante absoluto en la zona del negocio. */
function toIso(localValue: string, timeZone: string): string {
  const dateKey = localValue.slice(0, 10)
  return new Date(`${localValue}:00${zoneOffset(dateKey, timeZone)}`).toISOString()
}

function Row({
  appointment,
  timeZone,
  messaging,
}: {
  appointment: AdminAppointment
  timeZone: string
  messaging: Messaging
}) {
  const [panel, setPanel] = useState<'none' | 'move' | 'cancel'>('none')
  const [error, setError] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [moveValue, setMoveValue] = useState('')
  const [isPending, startTransition] = useTransition()

  const config = APPOINTMENT_STATUS[appointment.status]

  // El mensaje se arma con la plantilla que corresponde al estado actual y se
  // abre en WhatsApp ya escrito. No hay envío automático todavía: esto es el
  // mismo texto que usará el canal cuando se conecte, disponible hoy.
  const values = {
    cliente: appointment.client?.full_name.split(' ')[0] ?? '',
    servicio: appointment.service?.name ?? '',
    fecha: formatDateLong(appointment.starts_at, timeZone),
    hora: formatTime(appointment.starts_at, timeZone),
    negocio: messaging.businessName,
    precio: formatPrice(appointment.price_snapshot),
    senia: formatPrice(appointment.deposit_amount_snapshot),
    alias: messaging.alias,
    estado: config.label,
  }

  const template = appointment.status.startsWith('cancelled')
    ? messaging.cancellation
    : appointment.status === 'confirmed'
      ? messaging.confirmation
      : messaging.statusChange

  const phone = appointment.client?.phone ?? ''
  const messageLink = whatsappMessageLink(phone, renderTemplate(template, values))
  const reminderLink = whatsappMessageLink(phone, renderTemplate(messaging.reminder, values))

  function changeStatus(status: AppointmentStatus) {
    if (status.startsWith('cancelled')) {
      setPanel('cancel')
      return
    }

    startTransition(async () => {
      const result = await updateAppointmentStatusAction(appointment.id, status)
      setError(result.ok ? null : (result.error ?? null))
    })
  }

  function confirmCancel() {
    startTransition(async () => {
      const result = await updateAppointmentStatusAction(
        appointment.id,
        'cancelled_by_business',
        reason,
      )
      if (result.ok) setPanel('none')
      setError(result.ok ? null : (result.error ?? null))
    })
  }

  function move() {
    if (!moveValue) return

    startTransition(async () => {
      const result = await moveAppointmentAction(appointment.id, toIso(moveValue, timeZone))
      if (result.ok) setPanel('none')
      setError(result.ok ? null : (result.error ?? null))
    })
  }

  return (
    <li className="min-w-0 rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-soft transition-shadow duration-300 hover:shadow-lifted sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="tnum text-sm">{formatDateTime(appointment.starts_at, timeZone)}</p>
          <p className="mt-1 truncate font-medium">
            {appointment.client?.full_name ?? 'Cliente eliminado'}
          </p>
          <p className="tnum break-words text-sm text-muted">
            {appointment.client?.phone}
            {appointment.service && ` · ${appointment.service.name}`}
            {` · ${formatDuration(appointment.duration_min_snapshot)}`}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <StatusBadge status={appointment.status} />
          <p className="tnum text-sm">{formatPrice(appointment.price_snapshot)}</p>
          {appointment.status === 'pending_confirmation' && (
            <p className="tnum text-xs text-status-pending">
              Seña {formatPrice(appointment.deposit_amount_snapshot)}
            </p>
          )}
        </div>
      </div>

      {appointment.client_notes && (
        <p className="mt-3 break-words rounded-[var(--radius-soft)] bg-veil/60 px-3.5 py-2.5 text-sm text-muted">
          {appointment.client_notes}
        </p>
      )}

      {error && (
        <div className="mt-3">
          <FormAlert tone="error">{error}</FormAlert>
        </div>
      )}

      {(messageLink || reminderLink) && (
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line pt-4 text-sm">
          {messageLink && (
            <a
              href={messageLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent transition-opacity duration-300 hover:opacity-70"
            >
              Escribir por WhatsApp
            </a>
          )}
          {reminderLink && !config.isTerminal && (
            <a
              href={reminderLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted transition-colors duration-300 hover:text-accent"
            >
              Enviar recordatorio
            </a>
          )}
        </div>
      )}

      {!config.isTerminal && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor={`estado-${appointment.id}`}>
            Cambiar estado
          </label>
          <select
            id={`estado-${appointment.id}`}
            value={appointment.status}
            disabled={isPending}
            onChange={(event) => changeStatus(event.target.value as AppointmentStatus)}
            className="w-full min-w-0 rounded-full border border-line bg-surface px-4 py-2.5 text-sm transition-colors duration-300 hover:border-ink sm:w-auto"
          >
            {APPOINTMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {APPOINTMENT_STATUS[status].label}
              </option>
            ))}
          </select>

          <Button
            type="button"
            variant="secondary"
            className="w-full px-5 py-2.5 text-sm sm:w-auto"
            onClick={() => setPanel(panel === 'move' ? 'none' : 'move')}
          >
            Mover
          </Button>
        </div>
      )}

      {panel === 'move' && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            type="datetime-local"
            value={moveValue}
            onChange={(event) => setMoveValue(event.target.value)}
            className="tnum w-full min-w-0 rounded-[var(--radius-soft)] border border-line bg-surface px-3.5 py-2.5 text-sm sm:w-auto"
          />
          <Button
            type="button"
            className="w-full px-5 py-2.5 text-sm sm:w-auto"
            onClick={move}
            disabled={isPending}
          >
            {isPending ? 'Moviendo…' : 'Guardar'}
          </Button>
          <p className="w-full text-xs text-muted">
            Si el horario nuevo se superpone con otro turno activo, la base lo rechaza.
          </p>
        </div>
      )}

      {panel === 'cancel' && (
        <div className="mt-3 flex flex-col gap-2">
          <label htmlFor={`motivo-${appointment.id}`} className="text-sm">
            Motivo de la cancelación
          </label>
          <textarea
            id={`motivo-${appointment.id}`}
            rows={2}
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="w-full resize-none rounded-xl border border-line bg-surface px-4 py-2.5 text-sm"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              className="px-4 py-2 text-sm"
              onClick={confirmCancel}
              disabled={isPending}
            >
              {isPending ? 'Cancelando…' : 'Cancelar turno'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="px-4 py-2 text-sm"
              onClick={() => setPanel('none')}
            >
              Volver
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}

export function AppointmentsTable({
  appointments,
  timeZone,
  messaging,
}: {
  appointments: AdminAppointment[]
  timeZone: string
  messaging: Messaging
}) {
  if (appointments.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] border border-line bg-surface p-6 text-sm text-muted">
        No hay turnos que coincidan con el filtro.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {appointments.map((appointment) => (
        <Row
          key={appointment.id}
          appointment={appointment}
          timeZone={timeZone}
          messaging={messaging}
        />
      ))}
    </ul>
  )
}
