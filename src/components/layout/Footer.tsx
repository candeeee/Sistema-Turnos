import Link from 'next/link'

import type { BusinessSettings } from '@/lib/services/settings'
import { whatsappLink } from '@/lib/services/settings'
import { FOOTER_LINKS } from '@/lib/navigation'
import { ROUTES } from '@/lib/constants'

export function Footer({
  settings,
  isAdmin = false,
}: {
  settings: BusinessSettings
  isAdmin?: boolean
}) {
  const whatsapp = whatsappLink(settings, 'Hola, quiero hacer una consulta.')
  const year = new Date().getFullYear()

  const socials = [
    settings.instagram && {
      href: `https://instagram.com/${settings.instagram.replace('@', '')}`,
      label: 'Instagram',
    },
    settings.facebook && { href: `https://facebook.com/${settings.facebook}`, label: 'Facebook' },
    whatsapp && { href: whatsapp, label: 'WhatsApp' },
  ].filter(Boolean) as { href: string; label: string }[]

  return (
    <footer className="mt-28 border-t border-line/70 bg-veil/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:grid-cols-3 sm:px-8">
        <div>
          <p className="font-display text-2xl font-light">{settings.name}</p>
          {settings.address && (
            <p className="mt-3 text-sm leading-relaxed text-muted">{settings.address}</p>
          )}
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Contacto</p>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {settings.phone && (
              <li className="tnum">
                <a
                  href={`tel:${settings.phone.replace(/\s/g, '')}`}
                  className="transition-colors duration-300 hover:text-accent"
                >
                  {settings.phone}
                </a>
              </li>
            )}
            {settings.email && (
              <li>
                <a
                  href={`mailto:${settings.email}`}
                  className="transition-colors duration-300 hover:text-accent"
                >
                  {settings.email}
                </a>
              </li>
            )}
            {socials.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors duration-300 hover:text-accent"
                >
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Navegación</p>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition-colors duration-300 hover:text-accent">
                  {link.label}
                </Link>
              </li>
            ))}
            {!isAdmin && (
              <li>
                <Link
                  href={ROUTES.book}
                  className="transition-colors duration-300 hover:text-accent"
                >
                  Reservar turno
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>

      <p className="tnum border-t border-line/70 px-5 py-6 text-center text-xs text-muted">
        © {year} {settings.name}
      </p>
    </footer>
  )
}
