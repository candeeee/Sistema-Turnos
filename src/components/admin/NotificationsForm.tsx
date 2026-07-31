'use client'

import { useActionState, useState } from 'react'
import { motion } from 'framer-motion'

import { updateNotificationsAction } from '@/lib/actions/admin/notifications'
import { IDLE_STATE } from '@/lib/actions/types'
import type { BusinessSettings } from '@/lib/services/settings'
import { renderTemplate, TEMPLATE_VARIABLES } from '@/utils/templates'
import { DEFAULT_MESSAGES, type MessageKey } from '@/lib/notifications/defaults'
import { FormAlert } from '@/components/ui/FormAlert'
import { SubmitButton } from '@/components/ui/Button'

/** Valores de muestra para la vista previa. No se guardan en ningún lado. */
const PREVIEW = {
  cliente: 'Camila',
  servicio: 'Lifting de pestañas',
  fecha: 'martes 12 de agosto',
  hora: '15:30',
  precio: '$25.000',
  senia: '$7.500',
  estado: 'Confirmado',
}

/**
 * Un mensaje con su vista previa al lado.
 *
 * La previsualización se actualiza mientras se escribe: es la única forma de
 * que alguien sin conocimientos técnicos entienda qué hacen las llaves sin
 * tener que mandarse un WhatsApp de prueba.
 */
function MessageField({
  name,
  messageKey,
  label,
  description,
  defaultValue,
  businessName,
  alias,
}: {
  /** Nombre del campo del formulario. Lo lee Zod en la Server Action. */
  name: 'messageConfirmation' | 'messageReminder' | 'messageCancellation' | 'messageStatusChange'
  /** Columna de business_settings. Es la clave del texto por defecto. */
  messageKey: MessageKey
  label: string
  description: string
  defaultValue: string | null | undefined
  businessName: string
  alias: string
}) {
  // El respaldo cubre el caso de una base sin la migración aplicada: el campo
  // se muestra con el texto por defecto del producto en lugar de quedar vacío,
  // así guardarlo deja la plantilla correcta en la base.
  const [value, setValue] = useState(
    typeof defaultValue === 'string' && defaultValue.trim() !== ''
      ? defaultValue
      : DEFAULT_MESSAGES[messageKey],
  )

  const preview = renderTemplate(value, {
    ...PREVIEW,
    negocio: businessName || 'tu negocio',
    alias: alias || 'tu.alias',
  })

  return (
    <div className="min-w-0 rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-soft sm:p-6">
      <label htmlFor={name} className="font-display text-xl font-light">
        {label}
      </label>
      <p className="mt-1 text-sm text-muted">{description}</p>

      <textarea
        id={name}
        name={name}
        rows={4}
        maxLength={800}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="mt-4 w-full resize-none rounded-[var(--radius-soft)] border border-transparent bg-veil/50 px-4 py-3.5 text-sm leading-relaxed transition-all duration-300 focus:border-accent/60 focus:bg-surface focus:outline-none"
      />

      <div className="mt-4 rounded-[var(--radius-soft)] bg-accent-soft/60 p-4">
        <p className="text-[11px] uppercase tracking-[0.16em] text-accent-ink">Vista previa</p>
        <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-ink">
          {preview || 'Escribí el mensaje para ver cómo queda.'}
        </p>
      </div>
    </div>
  )
}

function Toggle({
  name,
  label,
  description,
  defaultChecked,
  children,
}: {
  name: string
  label: string
  description: string
  defaultChecked: boolean
  children?: React.ReactNode
}) {
  const [enabled, setEnabled] = useState(defaultChecked)

  return (
    <div className="min-w-0 rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-soft sm:p-6">
      <label className="flex cursor-pointer items-start justify-between gap-4">
        <span>
          <span className="block font-display text-xl font-light">{label}</span>
          <span className="mt-1 block text-sm leading-relaxed text-muted">{description}</span>
        </span>

        <span className="relative mt-1 shrink-0">
          <input
            type="checkbox"
            name={name}
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            className="peer sr-only"
          />
          <span
            className={`block h-7 w-12 rounded-full transition-colors duration-300 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${
              enabled ? 'bg-accent' : 'bg-line'
            }`}
          />
          <motion.span
            animate={{ x: enabled ? 22 : 3 }}
            transition={{ type: 'spring', stiffness: 500, damping: 34 }}
            className="absolute top-1 left-0 block h-5 w-5 rounded-full bg-surface shadow-soft"
          />
        </span>
      </label>

      {children && (
        <motion.div
          initial={false}
          animate={{ height: enabled ? 'auto' : 0, opacity: enabled ? 1 : 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className="pt-5">{children}</div>
        </motion.div>
      )}
    </div>
  )
}

export function NotificationsForm({ settings }: { settings: BusinessSettings }) {
  const [state, formAction] = useActionState(updateNotificationsAction, IDLE_STATE)

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {state.status === 'success' && state.message && (
        <FormAlert tone="success">{state.message}</FormAlert>
      )}
      {state.error && <FormAlert tone="error">{state.error}</FormAlert>}

      <Toggle
        name="remindersEnabled"
        label="Recordatorios automáticos"
        description="Cada turno encola su recordatorio al reservarse. Si el turno se cancela o se mueve, la cola se actualiza sola."
        defaultChecked={settings.reminders_enabled}
      >
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label htmlFor="reminderHoursBefore" className="text-muted">
            Enviar
          </label>
          <input
            id="reminderHoursBefore"
            name="reminderHoursBefore"
            type="number"
            min={1}
            max={168}
            defaultValue={settings.reminder_hours_before}
            className="tnum w-20 rounded-[var(--radius-soft)] border border-transparent bg-veil/50 px-3 py-2 text-center transition-colors duration-300 focus:border-accent/60 focus:bg-surface focus:outline-none"
          />
          <span className="text-muted">horas antes del turno</span>
        </div>
      </Toggle>

      <Toggle
        name="secondReminderEnabled"
        label="Segundo recordatorio"
        description="Un aviso adicional más cerca del turno. Sirve para bajar el ausentismo el mismo día."
        defaultChecked={settings.second_reminder_enabled}
      >
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label htmlFor="secondReminderHours" className="text-muted">
            Enviar
          </label>
          <input
            id="secondReminderHours"
            name="secondReminderHours"
            type="number"
            min={1}
            max={72}
            defaultValue={settings.second_reminder_hours}
            className="tnum w-20 rounded-[var(--radius-soft)] border border-transparent bg-veil/50 px-3 py-2 text-center transition-colors duration-300 focus:border-accent/60 focus:bg-surface focus:outline-none"
          />
          <span className="text-muted">horas antes del turno</span>
        </div>
      </Toggle>

      <section>
        <h2 className="mb-1 font-display text-2xl font-light">Mensajes</h2>
        <p className="mb-5 text-sm leading-relaxed text-muted">
          Escribí el texto y usá las variables entre llaves: el sistema las reemplaza por los datos
          reales de cada turno.
        </p>

        <ul className="mb-5 flex flex-wrap gap-2">
          {TEMPLATE_VARIABLES.map((variable) => (
            <li
              key={variable.key}
              title={variable.description}
              className="tnum rounded-full bg-veil px-3 py-1.5 text-xs text-muted"
            >
              {`{${variable.key}}`}
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-4">
          <MessageField
            name="messageConfirmation"
            messageKey="message_confirmation"
            label="Confirmación del turno"
            description="Se manda cuando registrás la seña y el turno pasa a confirmado."
            defaultValue={settings.message_confirmation}
            businessName={settings.name}
            alias={settings.deposit_alias}
          />

          <MessageField
            name="messageReminder"
            messageKey="message_reminder"
            label="Recordatorio"
            description="El aviso previo al turno. Lo usan los dos recordatorios."
            defaultValue={settings.message_reminder}
            businessName={settings.name}
            alias={settings.deposit_alias}
          />

          <MessageField
            name="messageCancellation"
            messageKey="message_cancellation"
            label="Cancelación"
            description="Cuando el negocio cancela un turno."
            defaultValue={settings.message_cancellation}
            businessName={settings.name}
            alias={settings.deposit_alias}
          />

          <MessageField
            name="messageStatusChange"
            messageKey="message_status_change"
            label="Cambio de estado"
            description="Para cualquier otro cambio: reprogramaciones, ausencias, turnos finalizados."
            defaultValue={settings.message_status_change}
            businessName={settings.name}
            alias={settings.deposit_alias}
          />
        </div>
      </section>

      <div className="sticky bottom-20 z-10 flex justify-stretch sm:justify-end lg:bottom-4">
        <SubmitButton pendingLabel="Guardando…" className="w-full sm:w-auto">
          Guardar notificaciones
        </SubmitButton>
      </div>
    </form>
  )
}
