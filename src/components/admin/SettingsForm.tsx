'use client'

import { useActionState } from 'react'

import { updateSettingsAction } from '@/lib/actions/admin/settings'
import { IDLE_STATE } from '@/lib/actions/types'
import type { BusinessSettings } from '@/lib/services/settings'
import { TIMEZONES } from '@/lib/constants'

import { Field } from '@/components/ui/Field'
import { FormAlert } from '@/components/ui/FormAlert'
import { SubmitButton } from '@/components/ui/Button'

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-soft sm:p-6">
      <h2 className="text-xs uppercase tracking-[0.15em] text-muted">{title}</h2>
      {hint && <p className="mt-2 text-sm text-muted">{hint}</p>}
      <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

export function SettingsForm({ settings }: { settings: BusinessSettings }) {
  const [state, formAction] = useActionState(updateSettingsAction, IDLE_STATE)

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {state.status === 'success' && state.message && (
        <FormAlert tone="success">{state.message}</FormAlert>
      )}
      {state.error && <FormAlert tone="error">{state.error}</FormAlert>}

      <Section title="Datos del negocio">
        <Field label="Nombre" name="name" defaultValue={settings.name} />
        <Field label="Teléfono" name="phone" defaultValue={settings.phone} />
        <Field
          label="WhatsApp"
          name="whatsapp"
          defaultValue={settings.whatsapp}
          hint="Con código de país, por ejemplo 5491160192994."
        />
        <Field label="Email" name="email" type="email" defaultValue={settings.email} />
        <Field label="Dirección" name="address" defaultValue={settings.address} />
        <Field
          label="Link del mapa"
          name="mapsUrl"
          defaultValue={settings.maps_url ?? ''}
          hint="Pegá el link de Google Maps."
          error={state.fieldErrors?.mapsUrl}
        />
        <Field label="Instagram" name="instagram" defaultValue={settings.instagram} hint="Solo el usuario, sin @." />
        <Field label="Facebook" name="facebook" defaultValue={settings.facebook} />
      </Section>

      <Section
        title="Operación"
        hint="Zona horaria del negocio y política de cancelación que ve el cliente."
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="timezone" className="text-sm font-medium">
            Zona horaria
          </label>
          <select
            id="timezone"
            name="timezone"
            defaultValue={settings.timezone}
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-base transition-colors duration-200 focus:border-accent"
          >
            {TIMEZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted">
            Define a qué hora real corresponde cada turno. Cambiarla mueve la lectura de toda la
            agenda.
          </p>
          {state.fieldErrors?.timezone && (
            <p className="text-xs text-status-cancelled">{state.fieldErrors.timezone}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="cancellationPolicy" className="text-sm font-medium">
            Política de cancelación
          </label>
          <textarea
            id="cancellationPolicy"
            name="cancellationPolicy"
            rows={3}
            maxLength={1000}
            defaultValue={settings.cancellation_policy}
            placeholder="Plazo para cancelar, qué pasa con la seña y cómo avisar."
            className="w-full resize-none rounded-xl border border-line bg-surface px-4 py-3 text-sm transition-colors duration-200 focus:border-accent"
          />
        </div>
      </Section>

      <Section
        title="Reglas de la agenda"
        hint="Cambiarlas afecta a los turnos nuevos. Los ya reservados conservan sus condiciones."
      >
        <Field
          label="Intervalo entre horarios (minutos)"
          name="slotIntervalMin"
          type="number"
          min={5}
          max={120}
          step={5}
          defaultValue={settings.slot_interval_min}
          hint="Cada cuánto se ofrece un horario nuevo."
          error={state.fieldErrors?.slotIntervalMin}
        />
        <Field
          label="Anticipación mínima (horas)"
          name="minHoursBeforeBooking"
          type="number"
          min={0}
          max={720}
          defaultValue={settings.min_hours_before_booking}
          hint="Con cuánta anticipación mínima se puede reservar."
        />
        <Field
          label="Se puede reservar hasta (días)"
          name="maxDaysAhead"
          type="number"
          min={1}
          max={365}
          defaultValue={settings.max_days_ahead}
        />
        <Field
          label="Cancelar o mover hasta (horas antes)"
          name="minHoursBeforeCancel"
          type="number"
          min={0}
          max={720}
          defaultValue={settings.min_hours_before_cancel}
        />
        <Field
          label="Vencimiento sin seña (horas)"
          name="holdHours"
          type="number"
          min={1}
          max={720}
          defaultValue={settings.hold_hours}
          hint="Pasado ese plazo el turno sin seña se cancela y libera el horario."
        />
      </Section>

      <Section title="Seña" hint="No se procesan pagos: solo se informan los datos para transferir.">
        <Field
          label="Porcentaje de seña"
          name="depositPercentage"
          type="number"
          min={0}
          max={100}
          step="0.5"
          defaultValue={settings.deposit_percentage}
          error={state.fieldErrors?.depositPercentage}
        />
        <Field label="Alias" name="depositAlias" defaultValue={settings.deposit_alias} />
        <Field label="CBU (opcional)" name="depositCbu" defaultValue={settings.deposit_cbu} />

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="depositInstructions" className="text-sm font-medium">
            Instrucciones de la seña
          </label>
          <textarea
            id="depositInstructions"
            name="depositInstructions"
            rows={3}
            maxLength={600}
            defaultValue={settings.deposit_instructions}
            className="w-full resize-none rounded-xl border border-line bg-surface px-4 py-3 text-sm transition-colors duration-200 focus:border-accent"
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="bookingNotice" className="text-sm font-medium">
            Texto antes de reservar
          </label>
          <textarea
            id="bookingNotice"
            name="bookingNotice"
            rows={2}
            maxLength={600}
            defaultValue={settings.booking_notice}
            className="w-full resize-none rounded-xl border border-line bg-surface px-4 py-3 text-sm transition-colors duration-200 focus:border-accent"
          />
        </div>
      </Section>

      {/* Los recordatorios se configuran en /admin/notificaciones. Sus valores
          viajan igual para no perderlos al guardar esta pantalla. */}
      <input type="hidden" name="reminderHoursBefore" value={settings.reminder_hours_before} />
      {settings.reminders_enabled && (
        <input type="hidden" name="remindersEnabled" value="on" />
      )}

      {/* En celular el botón queda fijo sobre la barra de navegación. */}
      <div className="sticky bottom-20 z-10 flex justify-stretch sm:justify-end lg:bottom-4">
        <SubmitButton pendingLabel="Guardando…" className="w-full sm:w-auto">
          Guardar configuración
        </SubmitButton>
      </div>
    </form>
  )
}
