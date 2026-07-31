'use client'

import { useState, useTransition } from 'react'

import type { AppointmentWithService } from '@/lib/services/appointments'
import { cancelAppointmentAction, rescheduleAppointmentAction } from '@/lib/actions/booking'
import { APPOINTMENT_STATUS } from '@/lib/constants'
import { formatDateLong, formatDuration, formatPrice, formatTime } from '@/utils/format'
import type { DateKey } from '@/utils/date'

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { FormAlert } from '@/components/ui/FormAlert'
import { DatePicker } from '@/components/booking/DatePicker'
import { TimePicker } from '@/components/booking/TimePicker'

export type AccountSettings = {
  timezone: string
  maxDaysAhead: number
  minHoursBeforeCancel: number
  depositAlias: string
  depositCbu: string
  whatsappUrl: string | null
}

export function AppointmentCard({
  appointment,
  settings,
  today,
  editable,
}: {
  appointment: AppointmentWithService
  settings: AccountSettings
  today: DateKey
  editable: boolean
}) {
  const [dialog, setDialog] = useState<'none' | 'cancel' | 'reschedule'>('none')
  const [error, setError] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [newDate, setNewDate] = useState<DateKey | null>(null)
  const [newStartsAt, setNewStartsAt] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const status = APPOINTMENT_STATUS[appointment.status]

  // La regla real vive en la base (cancel_appointment valida el plazo). Acá
  // solo se evita ofrecer un botón que la base va a rechazar.
  const hoursUntil = (new Date(appointment.starts_at).getTime() - Date.now()) / 3_600_000
  const canManage =
    editable &&
    !status.isTerminal &&
    appointment.status !== 'in_progress' &&
    hoursUntil >= settings.minHoursBeforeCancel

  const isPendingDeposit = appointment.status === 'pending_confirmation'

  function close() {
    setDialog('none')
    setError(null)
    setNewDate(null)
    setNewStartsAt(null)
  }

  function cancel() {
    startTransition(async () => {
      const result = await cancelAppointmentAction(appointment.id, reason)
      if (result.ok) close()
      else setError(result.error ?? null)
    })
  }

  function reschedule() {
    if (!newStartsAt) return

    startTransition(async () => {
      const result = await rescheduleAppointmentAction(appointment.id, newStartsAt)
      if (result.ok) close()
      else setError(result.error ?? null)
    })
  }

  return (
    <article className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="tnum text-sm text-muted">
            {formatDateLong(appointment.starts_at, settings.timezone)}
          </p>
          <p className="tnum mt-1 font-display text-3xl">
            {formatTime(appointment.starts_at, settings.timezone)}
          </p>
        </div>

        <StatusBadge status={appointment.status} full />
      </div>

      <dl className="mt-5 border-t border-line pt-4 text-sm">
        <div className="flex justify-between gap-4 py-1.5">
          <dt className="text-muted">Servicio</dt>
          <dd className="text-right">{appointment.service?.name ?? 'Servicio eliminado'}</dd>
        </div>
        <div className="flex justify-between gap-4 py-1.5">
          <dt className="text-muted">Duración</dt>
          <dd className="tnum text-right">{formatDuration(appointment.duration_min_snapshot)}</dd>
        </div>
        <div className="flex justify-between gap-4 py-1.5">
          <dt className="text-muted">Total</dt>
          <dd className="tnum text-right">{formatPrice(appointment.price_snapshot)}</dd>
        </div>
      </dl>

      {isPendingDeposit && (
        <div className="mt-4 rounded-xl border border-status-pending/30 bg-status-pending/5 p-4 text-sm">
          <p className="text-status-pending">
            Falta la seña de{' '}
            <span className="tnum">{formatPrice(appointment.deposit_amount_snapshot)}</span> (
            {Number(appointment.deposit_percentage_snapshot)}%).
          </p>

          {(settings.depositAlias || settings.depositCbu) && (
            <p className="tnum mt-1.5 text-muted">
              {settings.depositAlias && `Alias ${settings.depositAlias}`}
              {settings.depositAlias && settings.depositCbu && ' · '}
              {settings.depositCbu && `CBU ${settings.depositCbu}`}
            </p>
          )}

          {settings.whatsappUrl && (
            <a
              href={settings.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block font-medium text-accent underline-offset-4 hover:underline"
            >
              Enviar comprobante
            </a>
          )}
        </div>
      )}

      {appointment.cancellation_reason && (
        <p className="mt-4 text-sm text-muted">{appointment.cancellation_reason}</p>
      )}

      {canManage && (
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setDialog('reschedule')} className="text-sm">
            Reprogramar
          </Button>
          <Button variant="ghost" onClick={() => setDialog('cancel')} className="text-sm">
            Cancelar
          </Button>
        </div>
      )}

      {editable && !canManage && !status.isTerminal && (
        <p className="mt-5 text-xs text-muted">
          Los cambios se hacen hasta {settings.minHoursBeforeCancel} horas antes del turno.
          {settings.whatsappUrl && (
            <>
              {' '}
              <a
                href={settings.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline-offset-4 hover:underline"
              >
                Escribinos
              </a>{' '}
              si necesitás moverlo.
            </>
          )}
        </p>
      )}

      {/* Cancelar */}
      <Modal open={dialog === 'cancel'} onClose={close} title="Cancelar turno">
        <h2 className="font-display text-2xl">¿Cancelamos este turno?</h2>
        <p className="mt-2 text-sm text-muted">
          {formatDateLong(appointment.starts_at, settings.timezone)} a las{' '}
          <span className="tnum">{formatTime(appointment.starts_at, settings.timezone)}</span>. El
          horario queda liberado para otra persona.
        </p>

        {error && (
          <div className="mt-4">
            <FormAlert tone="error">{error}</FormAlert>
          </div>
        )}

        <label htmlFor={`reason-${appointment.id}`} className="mt-5 block text-sm font-medium">
          Motivo <span className="font-normal text-muted">(opcional)</span>
        </label>
        <textarea
          id={`reason-${appointment.id}`}
          rows={2}
          maxLength={500}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="mt-1.5 w-full resize-none rounded-xl border border-line bg-surface px-4 py-3 text-base transition-colors duration-200 focus:border-accent"
        />

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={close}>
            Volver
          </Button>
          <Button onClick={cancel} disabled={isPending}>
            {isPending ? 'Cancelando…' : 'Sí, cancelar turno'}
          </Button>
        </div>
      </Modal>

      {/* Reprogramar */}
      <Modal open={dialog === 'reschedule'} onClose={close} title="Reprogramar turno">
        <h2 className="font-display text-2xl">Elegí el nuevo horario</h2>
        <p className="mt-2 text-sm text-muted">
          Mantenés el mismo servicio y el mismo precio. El horario actual queda libre.
        </p>

        {error && (
          <div className="mt-4">
            <FormAlert tone="error">{error}</FormAlert>
          </div>
        )}

        {appointment.service && (
          <div className="mt-5 flex max-h-[55vh] flex-col gap-5 overflow-y-auto pr-1">
            <DatePicker
              serviceId={appointment.service.id}
              today={today}
              maxDaysAhead={settings.maxDaysAhead}
              selected={newDate}
              onSelect={(date) => {
                setNewDate(date)
                setNewStartsAt(null)
              }}
            />

            {newDate && (
              <TimePicker
                serviceId={appointment.service.id}
                date={newDate}
                timeZone={settings.timezone}
                selected={newStartsAt}
                onSelect={setNewStartsAt}
              />
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={close}>
            Volver
          </Button>
          <Button onClick={reschedule} disabled={!newStartsAt || isPending}>
            {isPending ? 'Moviendo…' : 'Confirmar cambio'}
          </Button>
        </div>
      </Modal>
    </article>
  )
}
