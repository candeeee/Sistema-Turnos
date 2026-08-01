#!/usr/bin/env node
/**
 * Reproduce localmente lo que hace Vercel.
 *
 *   npm run verify
 *
 * `next dev` no verifica tipos en todo el proyecto: compila solo lo que
 * visitás. `next build` sí, y por eso hay errores que aparecen recién en el
 * deploy. Este script corre la misma secuencia, en el mismo orden, y se
 * detiene en el primer fallo con una explicación de qué significa.
 */

import { spawnSync } from 'node:child_process'

const ok = (text) => `\x1b[32m✔\x1b[0m ${text}`
const fail = (text) => `\x1b[31m✖\x1b[0m ${text}`
const title = (text) => `\x1b[1m${text}\x1b[0m`

const PASOS = [
  {
    nombre: 'Versiones de Supabase',
    comando: 'node',
    args: ['scripts/check-deps.mjs'],
    siFalla:
      'Una versión de @supabase/supabase-js distinta a la declarada usa otro sistema\n' +
      '  de tipos, y el esquema entero resuelve a `never`. Es la causa más común de\n' +
      '  decenas de errores en cascada. Reinstalá con las versiones exactas.',
  },
  {
    nombre: 'Formato de los tipos generados',
    comando: 'node',
    args: ['scripts/check-types-sync.mjs'],
    siFalla:
      'src/types/database.types.ts fue editado a mano. Regeneralo con npm run db:types\n' +
      '  y movés cualquier tipo propio a src/types/domain.ts',
  },
  {
    nombre: 'Patrones de JSX',
    comando: 'node',
    args: ['scripts/check-jsx.mjs'],
    siFalla:
      'Un comentario mal ubicado en JSX rompe el build. Va ENCIMA del elemento,\n' +
      '  nunca entre sus atributos ni justo después de un paréntesis de apertura.',
  },
  {
    nombre: 'Sintaxis (SWC)',
    comando: 'node',
    args: ['scripts/check-syntax.mjs'],
    siFalla:
      'SWC es el compilador de Next y es más estricto que tsc en JSX. Un error acá\n' +
      '  hace fallar el build de Vercel aunque la verificación de tipos dé verde.',
  },
  {
    nombre: 'Consultas con select literal',
    comando: 'node',
    args: ['scripts/check-queries.mjs'],
    siFalla:
      'Un select() armado dinámicamente rompe la inferencia de supabase-js y produce\n' +
      '  errores "does not exist on type \'never\'" en cascada. Usá literales.',
  },
  {
    nombre: 'Verificación de tipos',
    comando: 'npx',
    args: ['tsc', '--noEmit'],
    siFalla:
      'Este es el paso que falla en Vercel. El mensaje de arriba indica el archivo\n' +
      '  y la línea exactos. Si dice "does not exist on type \'never\'", el tipo de esa\n' +
      '  tabla no se está infiriendo: revisá src/types/database.types.ts',
  },
  {
    nombre: 'Build de producción',
    comando: 'npx',
    args: ['next', 'build'],
    siFalla:
      'Si dice "Failed to collect page data", un módulo lanzó AL IMPORTARSE, no al\n' +
      '  renderizarse. Buscá código en el nivel superior de un archivo (fuera de toda\n' +
      '  función) que pueda fallar: validaciones de entorno, lecturas de process.env,\n' +
      '  clientes creados como constante del módulo.\n\n' +
      '  Si menciona una tabla o columna, faltan migraciones: npx supabase db push',
  },
]

console.log(`\n${title('Verificación previa al deploy')}\n${'─'.repeat(64)}`)

for (const [indice, paso] of PASOS.entries()) {
  console.log(`\n${title(`${indice + 1}/${PASOS.length} · ${paso.nombre}`)}\n`)

  const resultado = spawnSync(paso.comando, paso.args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })

  if (resultado.status !== 0) {
    console.log(`\n${fail(`Falló: ${paso.nombre}`)}\n`)
    console.log(`  ${paso.siFalla}\n`)
    process.exit(1)
  }

  console.log(`\n${ok(paso.nombre)}`)
}

console.log(`\n${ok('Todo en verde. Este commit va a compilar en Vercel.')}\n`)
