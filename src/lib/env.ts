/**
 * Acceso tipado a las variables de entorno.
 *
 * Todas las comprobaciones son **perezosas**: corren cuando alguien lee el
 * valor, nunca al importar el módulo.
 *
 * La razón es concreta. Durante `next build`, Next importa el layout raíz para
 * construir páginas que no necesitan datos —entre ellas `/_not-found`—. Si
 * este módulo lanzara al importarse, el build fallaría con
 * `Failed to collect page data for /_not-found`, un mensaje que no menciona
 * ninguna variable de entorno y manda a buscar el problema donde no está.
 *
 * Con validación perezosa, una variable ausente o mal escrita se manifiesta
 * donde se usa: al crear el cliente de Supabase, con un mensaje que nombra la
 * variable.
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
        'En local: copiá .env.example a .env.local, completala y reiniciá el servidor.\n' +
        'En Vercel: Project → Settings → Environment Variables, y volvé a desplegar.\n' +
        'Next.js lee las variables solo al arrancar.',
    )
  }
  return value
}

/**
 * Comprobaciones de forma.
 *
 * Son avisos, no bloqueos: una URL con un dominio propio o una clave de un
 * formato que todavía no existe son casos legítimos, y el proyecto no debería
 * negarse a arrancar por ellos. La única excepción es la clave secreta en una
 * variable pública, que sí detiene todo: esa variable viaja al navegador y la
 * clave ignora RLS, así que dejarla pasar expone la base entera.
 */
function validarClavePublica(key: string): string {
  if (key.startsWith('sb_secret_')) {
    throw new Error(
      'La clave SECRETA de Supabase está cargada en una variable NEXT_PUBLIC_.\n\n' +
        'Esa variable viaja al navegador y la clave secreta ignora RLS: quedaría ' +
        'expuesta toda la base. Movela a SUPABASE_SECRET_KEY, poné la clave ' +
        'publishable en NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY y rotá la secreta ' +
        'desde Project Settings → API Keys.',
    )
  }

  if (!key.startsWith('sb_publishable_') && !key.startsWith('eyJ')) {
    console.warn(
      '\n▲ La clave pública de Supabase no empieza con "sb_publishable_" ni con "eyJ". ' +
        'Si la conexión falla, revisá que esté completa y sea del mismo proyecto que la URL.',
    )
  }

  return key
}

function validarUrl(url: string): string {
  if (!/^https:\/\/[^/]+$/.test(url)) {
    console.warn(
      `\n▲ NEXT_PUBLIC_SUPABASE_URL tiene una forma inusual: "${url}". ` +
        'Se espera la Project URL completa, sin barra final ni ruta.',
    )
  }

  return url
}

/**
 * Seguras para el navegador: protegidas por RLS.
 *
 * Son getters, así que la validación ocurre en el primer acceso real. Next.js
 * reemplaza `process.env.NEXT_PUBLIC_*` en tiempo de build por su valor
 * literal, de modo que el nombre de cada variable tiene que escribirse
 * completo: un acceso dinámico devolvería `undefined` en el navegador.
 */
export const publicEnv = {
  get supabaseUrl(): string {
    return validarUrl(
      required('NEXT_PUBLIC_SUPABASE_URL', clean(process.env.NEXT_PUBLIC_SUPABASE_URL)),
    )
  },

  get supabaseKey(): string {
    return validarClavePublica(
      required(
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (o NEXT_PUBLIC_SUPABASE_ANON_KEY)',
        firstDefined(
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        ),
      ),
    )
  },

  get siteUrl(): string {
    return (clean(process.env.NEXT_PUBLIC_SITE_URL) ?? 'http://localhost:3000').replace(/\/$/, '')
  },
} as const

/** Solo servidor. Nunca se expone al navegador. */
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

/**
 * Indica si el entorno está completo, sin lanzar.
 *
 * La usa el layout raíz para no intentar leer la base durante el build cuando
 * las variables todavía no están cargadas.
 */
export function hasSupabaseConfig(): boolean {
  return Boolean(
    clean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      firstDefined(
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      ),
  )
}
