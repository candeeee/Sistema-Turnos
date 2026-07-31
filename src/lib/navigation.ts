import { ROUTES } from '@/lib/constants'

export type NavItem = {
  href: string
  label: string
}

export type NavContext = {
  isAuthenticated: boolean
  isAdmin: boolean
}

/**
 * Única fuente de verdad de la navegación.
 *
 * Antes cada superficie —header de escritorio, menú mobile, footer— decidía
 * por su cuenta qué mostrar, y por eso convivían "Panel" e "Ir al Panel". Acá
 * se decide una vez y todas consumen el mismo resultado: es imposible que se
 * desincronicen.
 *
 * Reglas:
 * · "Inicio" está siempre, en todas las pantallas y para todos los roles.
 * · El administrador no reserva turnos: no ve "Reservar" ni "Mis turnos".
 * · "Mi cuenta" es el perfil de la persona y existe para los dos roles.
 *   Los turnos del cliente viven en "Mis turnos", que es una ruta distinta.
 */
export function getNavItems({ isAuthenticated, isAdmin }: NavContext): NavItem[] {
  if (isAdmin) {
    return [
      { href: ROUTES.home, label: 'Inicio' },
      { href: ROUTES.account, label: 'Mi cuenta' },
      { href: ROUTES.admin, label: 'Panel' },
    ]
  }

  if (isAuthenticated) {
    return [
      { href: ROUTES.home, label: 'Inicio' },
      { href: ROUTES.book, label: 'Reservar turno' },
      { href: ROUTES.appointments, label: 'Mis turnos' },
      { href: ROUTES.account, label: 'Mi cuenta' },
    ]
  }

  return [
    { href: ROUTES.home, label: 'Inicio' },
    { href: ROUTES.book, label: 'Reservar turno' },
    { href: ROUTES.signIn, label: 'Ingresar' },
  ]
}

/** Enlaces informativos del pie. No dependen del rol. */
export const FOOTER_LINKS: NavItem[] = [
  { href: ROUTES.services, label: 'Servicios' },
  { href: ROUTES.contact, label: 'Contacto' },
]
