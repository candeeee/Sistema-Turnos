#!/usr/bin/env node
/**
 * Verifica que `database.types.ts` siga siendo un archivo generado.
 *
 *   npm run check:types
 *
 * El origen del `never` en el build de Vercel fue que ese archivo se editaba
 * a mano. Un archivo generado editado a mano deja de describir la base, pero
 * TypeScript no puede notarlo: para el compilador un tipo escrito a mano es
 * tan válido como uno correcto. Este control detecta las señales de edición
 * manual antes de que lleguen al deploy.
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const ok = (text) => `\x1b[32m✔\x1b[0m ${text}`
const fail = (text) => `\x1b[31m✖\x1b[0m ${text}`

const path = resolve(process.cwd(), 'src/types/database.types.ts')

if (!existsSync(path)) {
  console.log(fail('No existe src/types/database.types.ts. Ejecutá: npm run db:types\n'))
  process.exit(1)
}

const content = readFileSync(path, 'utf8')

/**
 * Cada patrón corresponde a una construcción que el generador nunca emite y
 * que además rompe la inferencia de supabase-js.
 */
const SENALES = [
  {
    patron: /Insert:\s*never/,
    problema: '`Insert: never` en una tabla',
    porque:
      'El generador siempre emite un objeto. `never` hace que el cliente no pueda inferir la tabla y todas sus consultas devuelven `never`.',
  },
  {
    patron: /Update:\s*never/,
    problema: '`Update: never` en una tabla',
    porque: 'Mismo efecto que el anterior sobre la inferencia.',
  },
  {
    patron: /Views:\s*Record<never,\s*never>/,
    problema: '`Views: Record<never, never>`',
    porque: 'El generador emite `{ [_ in never]: never }`. La otra forma no es asignable.',
  },
  {
    patron: /Args:\s*Record<string,\s*never>/,
    problema: '`Args: Record<string, never>` en una función',
    porque: 'El generador usa `Record<PropertyKey, never>` para funciones sin argumentos.',
  },
  {
    patron: /^export type (?!Json|Database)/m,
    problema: 'tipos propios declarados en el archivo generado',
    porque:
      'Se pierden al regenerar. Los tipos del dominio van en src/types/domain.ts, que deriva de este archivo.',
  },
]

console.log('\nVerificación de tipos generados\n' + '─'.repeat(64))

const encontrados = SENALES.filter((senal) => senal.patron.test(content))

if (encontrados.length === 0) {
  console.log(ok('database.types.ts tiene el formato del generador.'))
  console.log(ok('Los tipos del dominio están en src/types/domain.ts.\n'))
  process.exit(0)
}

console.log(fail(`${encontrados.length} señal(es) de edición manual:\n`))

for (const senal of encontrados) {
  console.log(`  • ${senal.problema}`)
  console.log(`    ${senal.porque}\n`)
}

console.log('  Regeneralo con: npm run db:types')
console.log('  Y movés cualquier tipo propio a src/types/domain.ts\n')
process.exit(1)
