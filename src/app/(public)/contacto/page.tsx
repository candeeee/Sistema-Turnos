import type { Metadata } from 'next'
import Link from 'next/link'

import { getBusinessSettings, whatsappLink } from '@/lib/services/settings'
import { getBusinessHoursByWeekday } from '@/lib/services/schedule'
import { getSessionContext } from '@/lib/services/session'
import { ROUTES, WEEKDAYS } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Contacto',
  description: 'Dónde estamos, cómo escribirnos y días de atención.',
}

export default async function ContactPage() {
  const [settings, hours, session] = await Promise.all([
    getBusinessSettings(),
    getBusinessHoursByWeekday(),
    getSessionContext(),
  ])
  const whatsapp = whatsappLink(settings, 'Hola, quiero hacer una consulta.')

  const contactRows = [
    settings.phone && { label: 'Teléfono', value: settings.phone, href: `tel:${settings.phone.replace(/\s/g, '')}` },
    settings.email && { label: 'Email', value: settings.email, href: `mailto:${settings.email}` },
    whatsapp && { label: 'WhatsApp', value: settings.whatsapp, href: whatsapp },
    settings.instagram && {
      label: 'Instagram',
      value: `@${settings.instagram.replace('@', '')}`,
      href: `https://instagram.com/${settings.instagram.replace('@', '')}`,
    },
    settings.facebook && {
      label: 'Facebook',
      value: settings.facebook,
      href: `https://facebook.com/${settings.facebook}`,
    },
  ].filter(Boolean) as { label: string; value: string; href: string }[]

  return (
    <main className="mx-auto max-w-5xl px-5 py-14 sm:py-20">
      <h1 className="font-display text-4xl sm:text-5xl">Contacto</h1>

      <div className="mt-10 grid gap-10 sm:grid-cols-2">
        <section>
          <h2 className="text-xs uppercase tracking-[0.15em] text-muted">Escribinos</h2>

          <dl className="mt-4">
            {contactRows.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-4 border-b border-line py-3 last:border-0"
              >
                <dt className="text-sm text-muted">{row.label}</dt>
                <dd className="text-right text-sm">
                  <a
                    href={row.href}
                    target={row.href.startsWith('http') ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className="transition-colors duration-200 hover:text-accent"
                  >
                    {row.value}
                  </a>
                </dd>
              </div>
            ))}
          </dl>

          {settings.address && (
            <>
              <h2 className="mt-10 text-xs uppercase tracking-[0.15em] text-muted">Dirección</h2>
              <p className="mt-3 text-lg">{settings.address}</p>

              {settings.maps_url && (
                <a
                  href={settings.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block rounded-full border border-line bg-surface px-5 py-2.5 text-sm transition-colors duration-200 hover:border-ink"
                >
                  Abrir en el mapa
                </a>
              )}
            </>
          )}
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-[0.15em] text-muted">Días de atención</h2>

          <dl className="mt-4">
            {WEEKDAYS.map((label, weekday) => {
              const franjas = hours[weekday] ?? []

              return (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-0"
                >
                  <dt className="text-sm">{label}</dt>
                  <dd className="tnum text-sm text-muted">
                    {franjas.length === 0
                      ? 'Cerrado'
                      : franjas
                          .map((f) => `${f.opens_at.slice(0, 5)}–${f.closes_at.slice(0, 5)}`)
                          .join(' · ')}
                  </dd>
                </div>
              )
            })}
          </dl>

          {!session.isAdmin && (
            <Link
              href={ROUTES.book}
              className="mt-8 inline-block rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-accent-hover"
            >
              Reservar turno
            </Link>
          )}
        </section>
      </div>
    </main>
  )
}
