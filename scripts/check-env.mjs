#!/usr/bin/env node
/**
 * Verificación de conexión con Supabase.
 *
 *   npm run check:env
 *
 * Lee .env.local, revisa el formato de cada valor y hace una consulta real
 * contra el proyecto. Sirve para separar dos problemas que se confunden todo
 * el tiempo: "la clave está mal escrita" y "la clave no corresponde a este
 * proyecto". No levanta Next.js ni depende de ninguna dependencia.
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const ok = (text) => `\x1b[32m✔\x1b[0m ${text}`
const fail = (text) => `\x1b[31m✖\x1b[0m ${text}`
const warn = (text) => `\x1b[33m▲\x1b[0m ${text}`

function readEnvFile(path) {
  if (!existsSync(path)) return null

  const env = {}
  for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const separator = line.indexOf('=')
    if (separator === -1) continue

    const key = line.slice(0, separator).trim()
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, '')

    env[key] = value
  }
  return env
}

const envPath = resolve(process.cwd(), '.env.local')
const env = readEnvFile(envPath)

console.log('\nVerificación de entorno\n' + '─'.repeat(60))

if (!env) {
  console.log(fail(`No existe ${envPath}`))
  console.log('  Ejecutá: cp .env.example .env.local y completá los valores.\n')
  process.exit(1)
}

console.log(ok(`.env.local encontrado (${Object.keys(env).length} variables)`))

const url = env.NEXT_PUBLIC_SUPABASE_URL
const publicKey =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const secretKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY

let problemas = 0

// --- URL ---------------------------------------------------------------
if (!url) {
  console.log(fail('Falta NEXT_PUBLIC_SUPABASE_URL'))
  problemas++
} else if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/.test(url)) {
  console.log(fail(`NEXT_PUBLIC_SUPABASE_URL tiene un formato raro: ${url}`))
  console.log('  Esperado: https://<ref>.supabase.co, sin barra final ni ruta.')
  problemas++
} else {
  console.log(ok(`URL del proyecto: ${url}`))
}

// --- Clave pública -----------------------------------------------------
if (!publicKey) {
  console.log(fail('Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (o _ANON_KEY)'))
  problemas++
} else if (publicKey.startsWith('sb_secret_')) {
  console.log(fail('¡La clave SECRETA está en una variable NEXT_PUBLIC_!'))
  console.log('  Esa variable viaja al navegador. Rotá la clave y volvé a cargarla bien.')
  problemas++
} else if (publicKey.startsWith('sb_publishable_')) {
  console.log(ok('Clave pública con el formato nuevo (sb_publishable_…)'))
} else if (publicKey.startsWith('eyJ')) {
  console.log(ok('Clave pública con el formato anterior (anon, JWT)'))
  console.log(
    warn(
      'Si el proyecto es reciente, puede tener las claves antiguas deshabilitadas.\n' +
        '  Revisá Project Settings → API Keys.',
    ),
  )
} else {
  console.log(fail(`La clave pública no arranca con "sb_publishable_" ni con "eyJ"`))
  console.log(`  Empieza con: "${publicKey.slice(0, 12)}…" (${publicKey.length} caracteres)`)
  problemas++
}

// --- Resto -------------------------------------------------------------
console.log(
  secretKey
    ? ok('Clave secreta configurada (solo se usa en el mantenimiento)')
    : warn('Sin clave secreta: /api/cron/mantenimiento no va a funcionar'),
)

console.log(
  env.CRON_SECRET
    ? ok('CRON_SECRET configurado')
    : warn('Sin CRON_SECRET: el mantenimiento automático queda deshabilitado'),
)

if (problemas > 0 || !url || !publicKey) {
  console.log('\n' + fail(`${problemas} problema(s) de formato. Corregilos y volvé a correr.\n`))
  process.exit(1)
}

// --- Prueba real contra el proyecto ------------------------------------
console.log('\nProbando la conexión\n' + '─'.repeat(60))

async function probe(label, path, key) {
  try {
    const response = await fetch(`${url}${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })

    const body = await response.text()

    if (response.ok) {
      console.log(ok(`${label}: respondió correctamente`))
      return true
    }

    console.log(fail(`${label}: HTTP ${response.status}`))
    console.log(`  ${body.slice(0, 300)}`)

    if (/invalid api key/i.test(body)) {
      console.log(
        '\n  Causas posibles, en orden de frecuencia:\n' +
          '   1. La clave es de otro proyecto distinto al de la URL.\n' +
          '   2. Está incompleta: se cortó al copiar (los JWT son larguísimos).\n' +
          '   3. El proyecto tiene deshabilitado ese tipo de clave\n' +
          '      (Project Settings → API Keys → legacy keys).\n' +
          '   4. Quedó con comillas, espacios o un salto de línea en .env.local.',
      )
    }

    if (response.status === 404 && /business_settings/.test(path)) {
      console.log('\n  La tabla no existe: faltan aplicar las migraciones.')
    }

    return false
  } catch (error) {
    console.log(fail(`${label}: no se pudo conectar — ${error.message}`))
    return false
  }
}

const authOk = await probe('Auth', '/auth/v1/settings', publicKey)
const restOk = await probe(
  'Base de datos',
  '/rest/v1/business_settings?select=id&limit=1',
  publicKey,
)

console.log('')

if (authOk && restOk) {
  console.log(ok('Conexión correcta. Podés levantar el proyecto con npm run dev.\n'))
  process.exit(0)
}

console.log(fail('Revisá los mensajes de arriba antes de levantar el proyecto.\n'))
process.exit(1)
