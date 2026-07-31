/**
 * Acceso tipado a las variables de entorno.
 *
 * Además de leerlas, verifica que tengan la forma correcta. Una clave con
 * comillas, con un salto de línea en el medio o pegada del proyecto
 * equivocado produce un "Invalid API key" de Supabase que no dice nada sobre
 * su causa; acá se detecta antes y se explica.
 *
 * Supabase renombró sus claves: los proyectos nuevos entregan
 * `sb_publishable_…` y `sb_secret_…` en lugar de `anon` y `service_role`
 * (que son JWT y empiezan con `eyJ`). Ambas nomenclaturas funcionan.
 */

/** Quita espacios, comillas envolventes y saltos de línea de un pegado. */
function clean(value: string | undefined): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '')
  return trimmed === '' ? undefined : trimmed
}

function firstDefined(...values: (string | undefined)[]): string | undefined {
  return values.map(clean).find(Boolean)
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}.\n\n` +
        'Copiá .env.example a .env.local, completala y reiniciá npm run dev: ' +
        'Next.js lee las variables solo al arrancar.',
    )
  }
  return value
}

const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL', clean(process.env.NEXT_PUBLIC_SUPABASE_URL))

// Next.js reemplaza `process.env.NEXT_PUBLIC_*` en tiempo de build, así que
// hay que nombrar cada variable de forma literal: un acceso dinámico
// devolvería undefined en el navegador.
const supabaseKey = required(
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (o NEXT_PUBLIC_SUPABASE_ANON_KEY)',
  firstDefined(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
)

if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/.test(supabaseUrl)) {
  throw new Error(
    `NEXT_PUBLIC_SUPABASE_URL no tiene la forma esperada: "${supabaseUrl}".\n\n` +
      'Tiene que ser la Project URL completa, sin barra final ni ruta. ' +
      'Ejemplo: https://abcdefghijklmno.supabase.co',
  )
}

// Una clave secreta en una variable pública se filtra al navegador y da acceso
// total a la base ignorando RLS. Es el peor error posible de configuración, así
// que el arranque se detiene.
if (supabaseKey.startsWith('sb_secret_')) {
  throw new Error(
    'La clave secreta de Supabase está cargada en una variable NEXT_PUBLIC_.\n\n' +
      'Esa variable viaja al navegador y la clave secreta ignora RLS: quedaría ' +
      'expuesta toda la base. Movela a SUPABASE_SECRET_KEY, poné la clave ' +
      'publishable en NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY y rotá la secreta ' +
      'desde Project Settings → API Keys.',
  )
}

if (!supabaseKey.startsWith('sb_publishable_') && !supabaseKey.startsWith('eyJ')) {
  throw new Error(
    'La clave pública de Supabase no tiene un formato reconocible.\n\n' +
      'Las claves nuevas empiezan con "sb_publishable_" y las anteriores (anon) ' +
      'son un JWT que empieza con "eyJ". Copiala completa desde ' +
      'Project Settings → API Keys, en una sola línea y sin comillas.',
  )
}

/** Seguras para el navegador: protegidas por RLS. */
export const publicEnv = {
  supabaseUrl,
  supabaseKey,
  siteUrl: (clean(process.env.NEXT_PUBLIC_SITE_URL) ?? 'http://localhost:3000').replace(/\/$/, ''),
} as const

/**
 * Solo servidor. Las claves se leen al usarlas y no al importar el módulo:
 * así una tarea que no necesita la clave secreta no falla por no tenerla.
 */
export const serverEnv = {
  get secretKey(): string {
    return required(
      'SUPABASE_SECRET_KEY (o SUPABASE_SERVICE_ROLE_KEY)',
      firstDefined(process.env.SUPABASE_SECRET_KEY, process.env.SUPABASE_SERVICE_ROLE_KEY),
    )
  },
  get cronSecret(): string {
    return required('CRON_SECRET', clean(process.env.CRON_SECRET))
  },
} as const
