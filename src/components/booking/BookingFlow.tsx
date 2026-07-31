'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'

import { bookAppointmentAction, type BookingState } from '@/lib/actions/booking'
import { IDLE_STATE } from '@/lib/actions/types'
import type { Service } from '@/lib/services/catalog'
import { ROUTES } from '@/lib/constants'
import { formatDateTime, formatDuration, formatPrice } from '@/utils/format'
import type { DateKey } from '@/utils/date'

import { Button } from '@/components/ui/Button'
import { FormAlert } from '@/components/ui/FormAlert'
import { ServicePicker } from './ServicePicker'
import { DatePicker } from './DatePicker'
import { TimePicker } from './TimePicker'
import { DepositModal } from './DepositModal'
import { BookingSuccess } from './BookingSuccess'
import { StepIndicator, type StepIndex } from './StepIndicator'

export type BookingSettings = {
  timezone: string
  depositPercentage: number
  depositAlias: string
  depositCbu: string
  depositInstructions: string
  bookingNotice: string
  maxDaysAhead: number
  whatsappUrl: string | null
}

export function BookingFlow({
  services,
  settings,
  client,
  today,
}: {
  services: Service[]
  settings: BookingSettings
  client: { fullName: string; phone: string }
  today: DateKey
}) {
  const [step, setStep] = useState<StepIndex>(0)
  const [service, setService] = useState<Service | null>(null)
  const [date, setDate] = useState<DateKey | null>(null)
  const [startsAt, setStartsAt] = useState<string | null>(null)
  const [depositOpen, setDepositOpen] = useState(false)

  const [state, formAction] = useActionState<BookingState, FormData>(
    bookAppointmentAction,
    IDLE_STATE,
  )

  if (state.status === 'success' && service && startsAt) {
    return (
      <BookingSuccess
        service={service}
        startsAt={startsAt}
        settings={settings}
        clientName={client.fullName}
      />
    )
  }

  // Cambiar de servicio invalida fecha y horario: la duración es distinta y
  // los horarios calculados dejan de valer.
  function selectService(next: Service) {
    setService(next)
    setDate(null)
    setStartsAt(null)
    setStep(1)
  }

  function selectDate(next: DateKey) {
    setDate(next)
    setStartsAt(null)
    setStep(2)
  }

  function selectTime(next: string) {
    setStartsAt(next)
    setStep(3)
  }

  return (
    <div className="flex flex-col gap-8">
      <StepIndicator current={step} onSelect={setStep} />

      {state.error && <FormAlert tone="error">{state.error}</FormAlert>}

      {step === 0 && (
        <section aria-label="Elegir servicio">
          <h2 className="mb-4 font-display text-2xl">¿Qué querés reservar?</h2>
          <ServicePicker services={services} selectedId={service?.id ?? null} onSelect={selectService} />
        </section>
      )}

      {step === 1 && service && (
        <section aria-label="Elegir fecha">
          <h2 className="mb-4 font-display text-2xl">Elegí el día</h2>
          <DatePicker
            serviceId={service.id}
            today={today}
            maxDaysAhead={settings.maxDaysAhead}
            selected={date}
            onSelect={selectDate}
          />
        </section>
      )}

      {step === 2 && service && date && (
        <section aria-label="Elegir horario">
          <h2 className="mb-4 font-display text-2xl">Elegí el horario</h2>
          <TimePicker
            serviceId={service.id}
            date={date}
            timeZone={settings.timezone}
            selected={startsAt}
            onSelect={selectTime}
          />
        </section>
      )}

      {step === 3 && service && startsAt && (
        <form action={formAction} className="flex flex-col gap-6">
          <input type="hidden" name="serviceId" value={service.id} />
          <input type="hidden" name="startsAt" value={startsAt} />

          <section aria-label="Confirmar datos">
            <h2 className="mb-4 font-display text-2xl">Revisá tus datos</h2>

            <dl className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
              <div className="flex justify-between gap-4 border-b border-line py-2.5 first:pt-0">
                <dt className="text-sm text-muted">Servicio</dt>
                <dd className="text-right text-sm">{service.name}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-line py-2.5">
                <dt className="text-sm text-muted">Cuándo</dt>
                <dd className="tnum text-right text-sm">
                  {formatDateTime(startsAt, settings.timezone)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-line py-2.5">
                <dt className="text-sm text-muted">Duración</dt>
                <dd className="tnum text-right text-sm">{formatDuration(service.duration_min)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-line py-2.5">
                <dt className="text-sm text-muted">A nombre de</dt>
                <dd className="text-right text-sm">
                  {client.fullName}
                  <span className="tnum block text-xs text-muted">{client.phone}</span>
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-2.5 pb-0">
                <dt className="text-sm text-muted">Total</dt>
                <dd className="tnum text-right text-sm">{formatPrice(service.price)}</dd>
              </div>
            </dl>

            <p className="mt-2 text-xs text-muted">
              ¿Cambiaron tu nombre o tu teléfono?{' '}
              <Link href={ROUTES.account} className="text-accent underline-offset-4 hover:underline">
                Actualizalos en tu cuenta
              </Link>
              .
            </p>
          </section>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="notes" className="text-sm font-medium">
              Comentarios <span className="font-normal text-muted">(opcional)</span>
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              maxLength={500}
              placeholder="Contanos algo que nos sirva saber antes de tu turno."
              className="w-full resize-none rounded-xl border border-line bg-surface px-4 py-3 text-base transition-colors duration-200 placeholder:text-muted focus:border-accent"
            />
            {state.fieldErrors?.notes && (
              <p className="text-xs text-status-cancelled">{state.fieldErrors.notes}</p>
            )}
          </div>

          {settings.bookingNotice && (
            <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
              {settings.bookingNotice}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setStep(2)}>
              Cambiar horario
            </Button>
            <Button type="button" onClick={() => setDepositOpen(true)}>
              Continuar
            </Button>
          </div>

          <DepositModal
            open={depositOpen}
            onClose={() => setDepositOpen(false)}
            percentage={settings.depositPercentage}
            price={service.price}
            alias={settings.depositAlias}
            cbu={settings.depositCbu}
            instructions={settings.depositInstructions}
            startsAt={startsAt}
            timeZone={settings.timezone}
            serviceName={service.name}
          />
        </form>
      )}
    </div>
  )
}
