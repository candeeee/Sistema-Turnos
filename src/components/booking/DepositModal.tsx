'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { formatDateTime, formatPrice } from '@/utils/format'

/** Fila con dato copiable: alias y CBU se copian, no se transcriben a mano. */
function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Sin permiso de portapapeles el valor sigue visible para copiarlo a mano.
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-0">
      <span className="text-sm text-muted">{label}</span>

      <button
        type="button"
        onClick={copy}
        className="tnum group flex items-center gap-2 text-sm transition-colors duration-200 hover:text-accent"
      >
        {value}
        <span className="text-xs text-muted transition-opacity duration-200 group-hover:text-accent">
          {copied ? 'copiado' : 'copiar'}
        </span>
      </button>
    </div>
  )
}

function ConfirmButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? 'Confirmando…' : 'Confirmar turno'}
    </Button>
  )
}

export function DepositModal({
  open,
  onClose,
  percentage,
  price,
  alias,
  cbu,
  instructions,
  startsAt,
  timeZone,
  serviceName,
}: {
  open: boolean
  onClose: () => void
  percentage: number
  price: number
  alias: string
  cbu: string
  instructions: string
  startsAt: string
  timeZone: string
  serviceName: string
}) {
  const amount = Math.round((price * percentage) / 100)

  return (
    <Modal open={open} onClose={onClose} title="Seña para confirmar el turno">
      <h2 className="font-display text-2xl leading-tight">Falta un paso: la seña</h2>

      <p className="mt-3 text-sm text-muted">
        Para confirmar el turno tenés que hacer una seña del{' '}
        <span className="tnum text-ink">{percentage}%</span> del valor del servicio.
      </p>

      <div className="mt-5 rounded-xl bg-accent-soft/60 p-4">
        <p className="text-sm">
          {serviceName} · {formatDateTime(startsAt, timeZone)}
        </p>
        <p className="tnum mt-1 text-2xl">{formatPrice(amount)}</p>
        <p className="mt-1 text-xs text-muted">Sobre un total de {formatPrice(price)}</p>
      </div>

      {(alias || cbu) && (
        <div className="mt-5">
          {alias && <CopyRow label="Alias" value={alias} />}
          {cbu && <CopyRow label="CBU" value={cbu} />}
        </div>
      )}

      {instructions && <p className="mt-4 text-sm text-muted">{instructions}</p>}

      <p className="mt-4 rounded-xl border border-status-pending/30 bg-status-pending/5 px-4 py-3 text-sm text-status-pending">
        Al confirmar, el turno queda reservado con el estado <strong>pendiente de confirmación</strong>{' '}
        hasta que registremos la seña.
      </p>

      <input type="hidden" name="depositAccepted" value="true" />

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
          Volver
        </Button>
        <ConfirmButton />
      </div>
    </Modal>
  )
}
