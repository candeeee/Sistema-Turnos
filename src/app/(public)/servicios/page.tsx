import type { Metadata } from 'next'
import Link from 'next/link'

import { getActiveServices } from '@/lib/services/catalog'
import { getSessionContext } from '@/lib/services/session'
import { ROUTES } from '@/lib/constants'
import { ServiceCard } from '@/components/site/ServiceCard'

export const metadata: Metadata = {
  title: 'Servicios',
  description: 'Todos los servicios disponibles, con su precio y su duración.',
}

export default async function ServicesPage() {
  const [services, session] = await Promise.all([getActiveServices(), getSessionContext()])

  return (
    <main className="mx-auto max-w-5xl px-5 py-14 sm:py-20">
      <h1 className="font-display text-4xl sm:text-5xl">Servicios</h1>
      <p className="mt-4 max-w-xl text-muted">
        Precio y duración de cada servicio. Los horarios libres se ven al reservar.
      </p>

      {services.length === 0 ? (
        <p className="mt-10 rounded-[var(--radius-card)] border border-line bg-surface p-6 text-sm text-muted">
          Todavía no hay servicios publicados.{' '}
          <Link href={ROUTES.contact} className="text-accent underline-offset-4 hover:underline">
            Escribinos
          </Link>{' '}
          y coordinamos por privado.
        </p>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <ServiceCard
              key={service.id}
              service={service}
              index={index}
              showBooking={!session.isAdmin}
            />
          ))}
        </div>
      )}
    </main>
  )
}
