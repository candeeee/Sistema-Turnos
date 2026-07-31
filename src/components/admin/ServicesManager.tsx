'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'

import {
  deleteServiceAction,
  saveServiceAction,
  toggleServiceAction,
} from '@/lib/actions/admin/services'
import { IDLE_STATE } from '@/lib/actions/types'
import type { Tables } from '@/types/database.types'
import { formatDuration, formatPrice } from '@/utils/format'

import { Button, SubmitButton } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { FormAlert } from '@/components/ui/FormAlert'
import { Modal } from '@/components/ui/Modal'
import { ImageUploader } from './ImageUploader'

type Service = Tables<'services'>

function ServiceForm({ service, onDone }: { service: Service | null; onDone: () => void }) {
  const [state, formAction] = useActionState(saveServiceAction, IDLE_STATE)

  // El listado lo revalida la propia acción; acá solo se cierra el modal.
  useEffect(() => {
    if (state.status === 'success') onDone()
  }, [state.status, onDone])

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {/* Encabezado y pie quedan fijos mientras el cuerpo del formulario
          scrollea dentro del modal. Los márgenes negativos compensan el
          padding del panel para que el fondo tape el contenido al pasar. */}
      <h2 className="sticky top-0 z-10 -mx-6 -mt-6 bg-surface px-6 pb-3 pt-6 font-display text-2xl sm:-mx-8 sm:-mt-8 sm:px-8 sm:pt-8">
        {service ? 'Editar servicio' : 'Nuevo servicio'}
      </h2>

      {state.error && <FormAlert tone="error">{state.error}</FormAlert>}

      {service && <input type="hidden" name="id" value={service.id} />}

      <Field
        label="Nombre"
        name="name"
        defaultValue={service?.name ?? ''}
        required
        error={state.fieldErrors?.name}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          Descripción
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={1000}
          defaultValue={service?.description ?? ''}
          className="w-full resize-none rounded-xl border border-line bg-surface px-4 py-3 text-sm transition-colors duration-200 focus:border-accent"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Precio"
          name="price"
          type="number"
          min={0}
          step="0.01"
          defaultValue={service?.price ?? ''}
          required
          error={state.fieldErrors?.price}
        />
        <Field
          label="Duración (minutos)"
          name="durationMin"
          type="number"
          min={5}
          max={600}
          step={5}
          defaultValue={service?.duration_min ?? 60}
          required
          error={state.fieldErrors?.durationMin}
        />
        <Field
          label="Buffer posterior (minutos)"
          name="bufferMin"
          type="number"
          min={0}
          max={240}
          step={5}
          defaultValue={service?.buffer_min ?? 0}
          hint="Tiempo de limpieza o preparación que queda bloqueado después del turno."
          error={state.fieldErrors?.bufferMin}
        />
        <Field
          label="Orden"
          name="sortOrder"
          type="number"
          min={0}
          max={999}
          defaultValue={service?.sort_order ?? 0}
          hint="Menor número, más arriba en el listado."
        />
      </div>

      <ImageUploader name="imagePath" defaultPath={service?.image_path ?? null} />

      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={service?.is_active ?? true}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
          Activo
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isFeatured"
            defaultChecked={service?.is_featured ?? false}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
          Destacado en la portada
        </label>
      </div>

      <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex flex-col-reverse gap-2 border-t border-line bg-surface px-6 pb-6 pt-4 sm:-mx-8 sm:-mb-8 sm:flex-row sm:justify-end sm:px-8 sm:pb-8">
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton pendingLabel="Guardando…">Guardar servicio</SubmitButton>
      </div>
    </form>
  )
}

export function ServicesManager({ services }: { services: Service[] }) {
  const [editing, setEditing] = useState<Service | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggle(service: Service) {
    startTransition(async () => {
      const result = await toggleServiceAction(service.id, !service.is_active)
      setError(result.ok ? null : (result.error ?? null))
    })
  }

  function remove(service: Service) {
    startTransition(async () => {
      const result = await deleteServiceAction(service.id)
      setError(result.ok ? null : (result.error ?? null))
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>Nuevo servicio</Button>
      </div>

      {error && <FormAlert tone="error">{error}</FormAlert>}

      {services.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-line bg-surface p-6 text-sm text-muted">
          Todavía no cargaste ningún servicio. Sin servicios activos nadie puede reservar.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {services.map((service) => (
            <li
              key={service.id}
              className={`flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[var(--radius-card)] border border-line bg-surface px-5 py-4 ${
                service.is_active ? '' : 'opacity-60'
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {service.name}
                  {service.is_featured && (
                    <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">
                      destacado
                    </span>
                  )}
                </span>
                <span className="tnum block text-sm text-muted">
                  {formatPrice(service.price)} · {formatDuration(service.duration_min)}
                  {service.buffer_min > 0 && ` (+${service.buffer_min} min)`}
                </span>
              </span>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  className="px-4 py-2 text-sm"
                  onClick={() => setEditing(service)}
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  className="px-4 py-2 text-sm"
                  onClick={() => toggle(service)}
                  disabled={isPending}
                >
                  {service.is_active ? 'Desactivar' : 'Activar'}
                </Button>
                <Button
                  variant="ghost"
                  className="px-4 py-2 text-sm"
                  onClick={() => remove(service)}
                  disabled={isPending}
                >
                  Eliminar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Nuevo servicio">
        <ServiceForm service={null} onDone={() => setCreating(false)} />
      </Modal>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Editar servicio">
        {editing && <ServiceForm service={editing} onDone={() => setEditing(null)} />}
      </Modal>
    </div>
  )
}
