import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Plus_Jakarta_Sans } from 'next/font/google'

import { getBusinessSettings } from '@/lib/services/settings'
import './globals.css'

/**
 * Dos familias y nada más: una serif de alto contraste para los títulos, que
 * aporta la carga expresiva, y una sans neutra de formas abiertas para todo lo
 * demás. Los números tabulares salen de la misma sans (clase `.tnum`): una
 * tercera familia solo para las horas ensuciaría la página.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-cormorant',
  display: 'swap',
})

export const viewport: Viewport = {
  themeColor: '#fdfbfa',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

/** Los metadatos salen de la configuración del negocio, no de constantes. */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getBusinessSettings()
  const name = settings.name || 'Reservá tu turno'

  return {
    title: { default: name, template: `%s · ${name}` },
    description: settings.address
      ? `Reservá tu turno online en ${name}. ${settings.address}.`
      : `Reservá tu turno online en ${name}.`,
    openGraph: { title: name, type: 'website', locale: 'es_AR' },
    robots: { index: true, follow: true },
    appleWebApp: { capable: true, title: name, statusBarStyle: 'default' },
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${jakarta.variable} ${cormorant.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
