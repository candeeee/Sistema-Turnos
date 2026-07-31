import type { Metadata } from 'next'
import Link from 'next/link'

import { ROUTES } from '@/lib/constants'
import { RegisterForm } from './RegisterForm'

export const metadata: Metadata = { title: 'Crear cuenta' }

export default function SignUpPage() {
  return (
    <>
      <header className="mb-7">
        <h1 className="font-display text-3xl leading-tight">Crear cuenta</h1>
        <p className="mt-2 text-sm text-muted">
          Con tu cuenta reservás turnos, los cancelás y los reprogramás cuando lo necesites.
        </p>
      </header>

      <RegisterForm />

      <p className="mt-6 text-center text-sm text-muted">
        ¿Ya tenés cuenta?{' '}
        <Link href={ROUTES.signIn} className="font-medium text-accent underline-offset-4 hover:underline">
          Iniciá sesión
        </Link>
      </p>
    </>
  )
}
