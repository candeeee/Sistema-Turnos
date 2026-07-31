import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { getCurrentClient } from '@/lib/services/clients'
import { getSessionContext } from '@/lib/services/session'
import { ROUTES } from '@/lib/constants'
import { formatDateTime } from '@/utils/format'
import { getBusinessSettings } from '@/lib/services/settings'
import { Avatar } from '@/components/ui/Avatar'
import { ProfileForm } from '@/components/account/ProfileForm'
import { PasswordForm } from '@/components/account/PasswordForm'
import { signOutAction } from '@/lib/actions/auth'

export const metadata: Metadata = { title: 'Mi cuenta' }
export const dynamic = 'force-dynamic'

function Card({
  title,
  description,
  children,
  delay = 0,
}: {
  title: string
  description?: string
  children: React.ReactNode
  delay?: number
}) {
  return (
    <section
      className="animate-rise rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-soft sm:p-8"
      style={{ '--delay': `${delay}ms` } as React.CSSProperties}
    >
      <h2 className="font-display text-2xl font-light">{title}</h2>
      {description && <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  )
}

/**
 * Perfil de la persona.
 *
 * Existe para los dos roles: un administrador también necesita cambiar su
 * contraseña y sus datos. Los turnos del cliente viven en /mis-turnos, que es
 * otra ruta y no aparece para el administrador. Esa separación es la que
 * permite que el panel y la cuenta convivan sin mezclarse.
 */
export default async function AccountPage() {
  const [session, client, settings] = await Promise.all([
    getSessionContext(),
    getCurrentClient(),
    getBusinessSettings(),
  ])

  if (!session.isAuthenticated) {
    redirect(`${ROUTES.signIn}?redirect=${encodeURIComponent(ROUTES.account)}`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const displayName = client?.full_name ?? session.displayName ?? 'Tu cuenta'

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-14 sm:px-8 sm:py-20">
      <header className="animate-rise flex flex-col items-center text-center">
        <Avatar name={displayName} size={92} />

        <h1 className="mt-6 font-display text-4xl font-light leading-tight sm:text-5xl">
          {displayName}
        </h1>

        <p className="tnum mt-2 text-sm text-muted">{user?.email}</p>

        <span
          className="mt-4 rounded-full px-4 py-1.5 text-xs tracking-wide"
          style={{
            color: session.isAdmin ? 'var(--color-accent-ink)' : 'var(--color-muted)',
            backgroundColor: session.isAdmin
              ? 'var(--color-accent-soft)'
              : 'var(--color-veil)',
          }}
        >
          {session.isAdmin ? 'Administradora' : 'Clienta'}
        </span>

        {session.isAdmin && (
          <Link
            href={ROUTES.admin}
            className="mt-7 rounded-full bg-accent px-7 py-3 text-sm font-medium text-white shadow-soft transition-all duration-300 hover:bg-accent-hover hover:shadow-lifted active:scale-[0.98]"
          >
            Entrar al panel
          </Link>
        )}
      </header>

      <div className="mt-12 flex flex-col gap-5">
        <Card
          title="Datos personales"
          description={
            session.isAdmin
              ? 'Así te ve el sistema. El nombre aparece en el registro de cambios de cada turno.'
              : 'Con estos datos te identificamos y te avisamos si hay algún cambio en tu turno.'
          }
          delay={60}
        >
          {client ? (
            <ProfileForm fullName={client.full_name} phone={client.phone} />
          ) : (
            <p className="text-sm text-muted">
              Tu ficha todavía no está creada. Cerrá sesión y volvé a entrar.
            </p>
          )}
        </Card>

        <Card
          title="Contraseña"
          description="Elegí una nueva. La sesión actual sigue abierta después del cambio."
          delay={120}
        >
          <PasswordForm />
        </Card>

        {!session.isAdmin && (
          <Card
            title="Tus turnos"
            description="Próximos, historial, cancelaciones y reprogramaciones."
            delay={180}
          >
            <Link
              href={ROUTES.appointments}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-6 py-3 text-sm transition-all duration-300 hover:border-ink"
            >
              Ver mis turnos
              <span aria-hidden>→</span>
            </Link>
          </Card>
        )}

        <div
          className="animate-rise flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-card)] border border-line bg-veil/40 px-6 py-5"
          style={{ '--delay': '240ms' } as React.CSSProperties}
        >
          <p className="tnum text-xs text-muted">
            {client && `En ${settings.name || 'el negocio'} desde ${formatDateTime(client.created_at, settings.timezone)}`}
          </p>

          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-full px-5 py-2.5 text-sm text-muted transition-colors duration-300 hover:bg-surface hover:text-ink"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
