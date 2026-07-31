'use client'

import Link from 'next/link'

import type { Service } from '@/lib/services/catalog'
import { ROUTES } from '@/lib/constants'
import { formatDateTime, formatPrice } from '@/utils/format'
import type { BookingSettings } from './BookingFlow'

/**
 * Cierre del flujo. Repite los datos de la seña a propósito: es el momento en
 * el que el cliente los necesita, y volver al modal ya no es posible.
 */
export function BookingSuccess({
  service,
  startsAt,
  settings,
  clientName,
}: {
  service: Service
  startsAt: string
  settings: BookingSettings
  clientName: string
}) {
  const amount = Math.round((service.price * settings.depositPercentage) / 100)

  return (
    <div className="animate-rise flex flex-col gap-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-status-pending">
          Pendiente de confirmación
        </p>
        <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">
          Listo, {clientName.split(' ')[0]}. Tu turno está reservado.
        </h2>
        <p className="mt-3 text-muted">
          Queda confirmado en cuanto registremos la seña de{' '}
          <span className="tnum text-ink">{formatPrice(amount)}</span>.
        </p>
      </header>

      <dl className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <div className="flex justify-between gap-4 border-b border-line py-2.5 first:pt-0">
          <dt className="text-sm text-muted">Servicio</dt>
          <dd className="text-right text-sm">{service.name}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-line py-2.5">
          <dt className="text-sm text-muted">Cuándo</dt>
          <dd className="tnum text-right text-sm">{formatDateTime(startsAt, settings.timezone)}</dd>
        </div>
        {settings.depositAlias && (
          <div className="flex justify-between gap-4 border-b border-line py-2.5">
            <dt className="text-sm text-muted">Alias</dt>
            <dd className="tnum text-right text-sm">{settings.depositAlias}</dd>
          </div>
        )}
        {settings.depositCbu && (
          <div className="flex justify-between gap-4 py-2.5 pb-0">
            <dt className="text-sm text-muted">CBU</dt>
            <dd className="tnum text-right text-sm">{settings.depositCbu}</dd>
          </div>
        )}
      </dl>

      {settings.depositInstructions && (
        <p className="text-sm text-muted">{settings.depositInstructions}</p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {settings.whatsappUrl && (
          <a
            href={settings.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-accent px-6 py-3 text-center text-sm font-medium text-white transition-colors duration-200 hover:bg-accent-hover"
          >
            Enviar el comprobante
          </a>
        )}

        <Link
          href={ROUTES.appointments}
          className="rounded-full border border-line bg-surface px-6 py-3 text-center text-sm font-medium transition-colors duration-200 hover:border-ink"
        >
          Ver mis turnos
        </Link>
      </div>
    </div>
  )
}
