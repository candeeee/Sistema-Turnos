'use client'

import { useActionState, useTransition } from 'react'

import { addClientNoteAction, deleteClientNoteAction } from '@/lib/actions/admin/clients'
import { IDLE_STATE } from '@/lib/actions/types'
import type { InternalNote } from '@/lib/services/admin/clients'
import { formatDateTime } from '@/utils/format'
import { FormAlert } from '@/components/ui/FormAlert'
import { SubmitButton } from '@/components/ui/Button'

/**
 * Observaciones privadas del negocio.
 *
 * Viven en su propia tabla porque RLS filtra filas y no columnas: si fueran una
 * columna de `clients`, el propio cliente las leería junto con su ficha.
 */
export function ClientNotes({
  clientId,
  notes,
  timeZone,
}: {
  clientId: string
  notes: InternalNote[]
  timeZone: string
}) {
  const [state, formAction] = useActionState(addClientNoteAction, IDLE_STATE)
  const [isPending, startTransition] = useTransition()

  function remove(noteId: string) {
    startTransition(async () => {
      await deleteClientNoteAction(noteId, clientId)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-2">
        {state.error && <FormAlert tone="error">{state.error}</FormAlert>}

        <input type="hidden" name="clientId" value={clientId} />

        <label htmlFor="body" className="sr-only">
          Nueva observación
        </label>
        <textarea
          id="body"
          name="body"
          rows={3}
          maxLength={2000}
          placeholder="Alergias, preferencias, avisos internos…"
          className="w-full resize-none rounded-xl border border-line bg-surface px-4 py-3 text-sm transition-colors duration-200 focus:border-accent"
        />
        {state.fieldErrors?.body && (
          <p className="text-xs text-status-cancelled">{state.fieldErrors.body}</p>
        )}

        <SubmitButton pendingLabel="Guardando…" variant="secondary" className="w-fit text-sm">
          Agregar observación
        </SubmitButton>
      </form>

      {notes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {notes.map((note) => (
            <li key={note.id} className="rounded-xl border border-line bg-surface p-4">
              <p className="text-sm whitespace-pre-line">{note.body}</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="tnum text-xs text-muted">
                  {formatDateTime(note.created_at, timeZone)}
                </span>
                <button
                  type="button"
                  onClick={() => remove(note.id)}
                  disabled={isPending}
                  className="text-xs text-muted transition-colors duration-200 hover:text-status-cancelled"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
