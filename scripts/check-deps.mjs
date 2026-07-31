#!/usr/bin/env node
/**
 * Verifica que las versiones instaladas de Supabase coincidan con el formato
 * de `src/types/database.types.ts`.
 *
 *   npm run check:deps
 *
 * `@supabase/supabase-js` cambió su sistema de tipos entre versiones menores:
 * a partir de 2.49 el tipo `Database` necesita una forma distinta. Un rango
 * abierto (`^2.45.4`) deja que npm instale cualquiera de las dos, y si no
 * coincide con el archivo de tipos, el esquema entero resuelve a `never` y
 * aparecen decenas de errores en cascada que no señalan la causa.
 *
 * Por eso las versiones están fijadas exactas en package.json, y este control
 * confirma que lo instalado sea lo declarado.
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const ok = (text) => `\x1b[32m✔\x1b[0m ${text}`
const fail = (text) => `\x1b[31m✖\x1b[0m ${text}`

const PAQUETES = ['@supabase/supabase-js', '@supabase/ssr']

const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'))

console.log('\nVerificación de dependencias\n' + '─'.repeat(64))

let problemas = 0

for (const paquete of PAQUETES) {
  const declarada = packageJson.dependencies?.[paquete]

  if (!declarada) {
    console.log(fail(`${paquete} no está en package.json`))
    problemas++
    continue
  }

  if (/[\^~><*]/.test(declarada)) {
    console.log(fail(`${paquete} usa un rango abierto: "${declarada}"`))
    console.log('    Fijala en una versión exacta: el archivo de tipos solo coincide con una.\n')
    problemas++
  }

  const manifiesto = resolve(process.cwd(), 'node_modules', paquete, 'package.json')

  if (!existsSync(manifiesto)) {
    console.log(fail(`${paquete} no está instalado. Ejecutá: npm install`))
    problemas++
    continue
  }

  const instalada = JSON.parse(readFileSync(manifiesto, 'utf8')).version

  if (instalada === declarada.replace(/^[\^~]/, '')) {
    console.log(ok(`${paquete} ${instalada}`))
  } else {
    console.log(fail(`${paquete}: declarada ${declarada}, instalada ${instalada}`))
    console.log('    Ejecutá: rm -rf node_modules package-lock.json && npm install\n')
    problemas++
  }
}

if (problemas > 0) {
  console.log(
    `\n${fail(`${problemas} problema(s).`)}\n\n` +
      '  Si querés usar una versión más nueva de Supabase, actualizá también los\n' +
      '  tipos con `npm run db:types`: se generan con el formato que espera la\n' +
      '  versión instalada del CLI y de la librería.\n',
  )
  process.exit(1)
}

console.log(ok('Las versiones coinciden con el formato del archivo de tipos.\n'))
