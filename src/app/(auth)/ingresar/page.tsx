import type { Metadata } from 'next'
import Link from 'next/link'

import { ROUTES } from '@/lib/constants'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = { title: 'Iniciar sesión' }

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>
}) {
  const params = await searchParams
  const redirectTo = params.redirect?.startsWith('/') ? params.redirect : undefined

  const linkError =
    params.error === 'link-vencido'
      ? 'Ese link ya venció. Pedí uno nuevo iniciando sesión.'
      : params.error === 'link-invalido'
        ? 'El link no es válido. Probá iniciar sesión con tu email.'
        : undefined

  return (
    <>
      <header className="mb-7">
        <h1 className="font-display text-3xl leading-tight">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-muted">
          Entrá para reservar un turno y ver los que ya tenés.
        </p>
      </header>

      <LoginForm redirectTo={redirectTo} linkError={linkError} />

      <p className="mt-6 text-center text-sm text-muted">
        ¿Todavía no tenés cuenta?{' '}
        <Link href={ROUTES.signUp} className="font-medium text-accent underline-offset-4 hover:underline">
          Creá una
        </Link>
      </p>
    </>
  )
}
