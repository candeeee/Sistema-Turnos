'use client'

import { useActionState, useTransition } from 'react'

import {
  deleteBusinessHourAction,
  deleteExceptionAction,
  saveBusinessHourAction,
  saveExceptionAction,
} from '@/lib/actions/admin/schedule'
import { IDLE_STATE } from '@/lib/actions/types'
import { SCHEDULE_EXCEPTION_LABEL, WEEKDAYS } from '@/lib/constants'
import type { Tables } from '@/types/domain'
import { formatDateTime } from '@/utils/format'

import { SubmitButton } from '@/components/ui/Button'
import { FormAlert } from '@/components/ui/FormAlert'

/**
 * Franjas de atención.
 *
 * Se admite más de una por día para poder cortar al mediodía. Que dos franjas
 * del mismo día no se superpongan lo verifica un trigger de la base.
 */
export function HoursEditor({ hours }: { hours: Tables<'business_hours'>[] }) {
  const [state, formAction] = useActionState(saveBusinessHourAction, IDLE_STATE)
  const [isPending, startTransition] = useTransition()

  function remove(id: string) {
    startTransition(async () => {
      await deleteBusinessHourAction(id)
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[var(--radius-card)] border border-line bg-surface">
        {WEEKDAYS.map((label, weekday) => {
          const franjas = hours.filter((hour) => hour.weekday === weekday)

          return (
            <div
              key={label}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3.5 last:border-0"
            >
              <span className="w-24 text-sm">{label}</span>

              {franjas.length === 0 ? (
                <span className="text-sm text-muted">Cerrado</span>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {franjas.map((hour) => (
                    <li
                      key={hour.id}
                      className="tnum flex items-center gap-2 rounded-full bg-paper px-3 py-1.5 text-sm"
                    >
                      {hour.opens_at.slice(0, 5)}–{hour.closes_at.slice(0, 5)}
                      <button
                        type="button"
                        onClick={() => remove(hour.id)}
                        disabled={isPending}
                        aria-label={`Eliminar franja de ${label}`}
                        className="text-muted transition-colors duration-200 hover:text-status-cancelled"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      <form
        action={formAction}
        className="flex flex-wrap items-end gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-5"
      >
        {state.error && (
          <div className="w-full">
            <FormAlert tone="error">{state.error}</FormAlert>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="weekday" className="text-xs text-muted">
            Día
          </label>
          <select
            id="weekday"
            name="weekday"
            defaultValue="1"
            className="rounded-xl border border-line bg-paper px-3 py-2 text-sm"
          >
            {WEEKDAYS.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="opensAt" className="text-xs text-muted">
            Abre
          </label>
          <input
            id="opensAt"
            name="opensAt"
            type="time"
            defaultValue="09:00"
            required
            className="tnum rounded-xl border border-line bg-paper px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="closesAt" className="text-xs text-muted">
            Cierra
          </label>
          <input
            id="closesAt"
            name="closesAt"
            type="time"
            defaultValue="18:00"
            required
            className="tnum rounded-xl border border-line bg-paper px-3 py-2 text-sm"
          />
        </div>

        <SubmitButton pendingLabel="Agregando…" variant="secondary" className="text-sm">
          Agregar franja
        </SubmitButton>

        {state.fieldErrors?.closesAt && (
          <p className="w-full text-xs text-status-cancelled">{state.fieldErrors.closesAt}</p>
        )}
      </form>
    </div>
  )
}

/**
 * Feriados, vacaciones y bloqueos: los tres son un rango de tiempo en el que no
 * se atiende, y el motor de disponibilidad los trata exactamente igual.
 */
export function ExceptionsEditor({
  exceptions,
  timeZone,
}: {
  exceptions: Tables<'schedule_exceptions'>[]
  timeZone: string
}) {
  const [state, formAction] = useActionState(saveExceptionAction, IDLE_STATE)
  const [isPending, startTransition] = useTransition()

  function remove(id: string) {
    startTransition(async () => {
      await deleteExceptionAction(id)
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {exceptions.length > 0 && (
        <ul className="flex flex-col gap-2">
          {exceptions.map((exception) => (
            <li
              key={exception.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[var(--radius-card)] border border-line bg-surface px-5 py-3.5"
            >
              <span className="rounded-full bg-paper px-3 py-1 text-xs">
                {SCHEDULE_EXCEPTION_LABEL[exception.type]}
              </span>
              <span className="tnum flex-1 text-sm">
                {formatDateTime(exception.starts_at, timeZone)} →{' '}
                {formatDateTime(exception.ends_at, timeZone)}
              </span>
              {exception.reason && (
                <span className="text-sm text-muted">{exception.reason}</span>
              )}
              <button
                type="button"
                onClick={() => remove(exception.id)}
                disabled={isPending}
                className="text-sm text-muted transition-colors duration-200 hover:text-status-cancelled"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        action={formAction}
        className="grid gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {state.error && (
          <div className="sm:col-span-2 lg:col-span-4">
            <FormAlert tone="error">{state.error}</FormAlert>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="type" className="text-xs text-muted">
            Tipo
          </label>
          <select
            id="type"
            name="type"
            defaultValue="block"
            className="rounded-xl border border-line bg-paper px-3 py-2 text-sm"
          >
            {Object.entries(SCHEDULE_EXCEPTION_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="startsAt" className="text-xs text-muted">
            Desde
          </label>
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            required
            className="tnum rounded-xl border border-line bg-paper px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="endsAt" className="text-xs text-muted">
            Hasta
          </label>
          <input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            required
            className="tnum rounded-xl border border-line bg-paper px-3 py-2 text-sm"
          />
          {state.fieldErrors?.endsAt && (
            <p className="text-xs text-status-cancelled">{state.fieldErrors.endsAt}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="reason" className="text-xs text-muted">
            Motivo (opcional)
          </label>
          <input
            id="reason"
            name="reason"
            maxLength={200}
            className="rounded-xl border border-line bg-paper px-3 py-2 text-sm"
          />
        </div>

        <div className="sm:col-span-2 lg:col-span-4">
          <SubmitButton pendingLabel="Guardando…" variant="secondary" className="text-sm">
            Agregar bloqueo
          </SubmitButton>
        </div>
      </form>
    </div>
  )
}
