import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getActiveServices } from '@/lib/services/catalog'
import { getBusinessSettings, whatsappLink } from '@/lib/services/settings'
import { getCurrentClient } from '@/lib/services/clients'
import { ROUTES } from '@/lib/constants'
import { toDateKey } from '@/utils/date'
import { BookingFlow } from '@/components/booking/BookingFlow'

export const metadata: Metadata = { title: 'Reservar turno' }

// La disponibilidad cambia a cada momento: esta página nunca se cachea.
export const dynamic = 'force-dynamic'

export default async function BookingPage() {
  const [settings, services, client] = await Promise.all([
    getBusinessSettings(),
    getActiveServices(),
    getCurrentClient(),
  ])

  // El middleware ya exige sesión; esto cubre el caso de una ficha que no se
  // creó (por ejemplo, un usuario dado de alta a mano en Supabase).
  if (!client) {
    redirect(`${ROUTES.signIn}?redirect=${encodeURIComponent(ROUTES.book)}`)
  }

  // "Hoy" se calcula en el servidor y en la zona del negocio: el reloj del
  // visitante no puede abrir ni cerrar días de la agenda.
  const today = toDateKey(new Date(), settings.timezone)

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-16">
      <h1 className="mb-8 font-display text-4xl leading-tight sm:text-5xl">Reservar turno</h1>

      <BookingFlow
        services={services}
        client={{ fullName: client.full_name, phone: client.phone }}
        today={today}
        settings={{
          timezone: settings.timezone,
          depositPercentage: Number(settings.deposit_percentage),
          depositAlias: settings.deposit_alias,
          depositCbu: settings.deposit_cbu,
          depositInstructions: settings.deposit_instructions,
          bookingNotice: settings.booking_notice,
          maxDaysAhead: settings.max_days_ahead,
          whatsappUrl: whatsappLink(settings, 'Hola, te envío el comprobante de la seña de mi turno.'),
        }}
      />
    </main>
  )
}
