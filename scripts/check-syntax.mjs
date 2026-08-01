#!/usr/bin/env node
/**
 * Verifica que todos los archivos compilen con SWC.
 *
 *   npm run check:syntax
 *
 * Existe porque `tsc --noEmit` y SWC no aceptan exactamente lo mismo. El caso
 * que motivó este control: un comentario entre los atributos de una etiqueta
 * JSX,
 *
 *     <div className="…" /* nota *\/>
 *
 * es válido para TypeScript y **rechazado** por SWC, que es el compilador que
 * usa Next. La verificación de tipos daba verde y el build de Vercel fallaba
 * con "Expected '</', got 'className'".
 *
 * Parsear con SWC tarda segundos, mientras que `next build` tarda minutos.
 * Este paso atrapa los errores de sintaxis antes de llegar ahí.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createRequire } from 'node:module'

const ok = (text) => `\x1b[32m✔\x1b[0m ${text}`
const fail = (text) => `\x1b[31m✖\x1b[0m ${text}`

const require = createRequire(import.meta.url)

let swc
try {
  swc = require('@swc/core')
} catch {
  console.log('\nVerificación de sintaxis\n' + '─'.repeat(64))
  console.log(
    '\x1b[33m▲\x1b[0m @swc/core no está instalado: NO se verificó la sintaxis.\n\n' +
      '  Next compila con SWC, no con tsc, y no aceptan exactamente lo mismo.\n' +
      '  Sin este paso, un error de JSX puede pasar la verificación de tipos y\n' +
      '  romper el build de Vercel.\n\n' +
      '  Instalalo con: npm install\n',
  )
  // Sale 0 a propósito: la ausencia de una herramienta opcional no debe
  // bloquear el trabajo. Pero el aviso queda visible y no dice "✔".
  process.exit(0)
}

const RAIZ = join(process.cwd(), 'src')

function archivos(directorio) {
  return readdirSync(directorio).flatMap((entrada) => {
    const ruta = join(directorio, entrada)
    if (statSync(ruta).isDirectory()) return archivos(ruta)
    return /\.tsx?$/.test(entrada) ? [ruta] : []
  })
}

console.log('\nVerificación de sintaxis\n' + '─'.repeat(64))

const errores = []
const todos = archivos(RAIZ)

for (const ruta of todos) {
  const esTsx = ruta.endsWith('.tsx')

  try {
    swc.parseSync(readFileSync(ruta, 'utf8'), {
      syntax: 'typescript',
      tsx: esTsx,
      decorators: false,
    })
  } catch (error) {
    errores.push({ ruta, mensaje: String(error.message ?? error).split('\n').slice(0, 6).join('\n') })
  }
}

if (errores.length === 0) {
  console.log(ok(`${todos.length} archivos compilan con SWC.\n`))
  process.exit(0)
}

console.log(fail(`${errores.length} archivo(s) con errores de sintaxis:\n`))

for (const error of errores) {
  console.log(`  ${relative(process.cwd(), error.ruta)}`)
  console.log(`${error.mensaje.replace(/^/gm, '    ')}\n`)
}

console.log(
  '  Recordá: SWC es más estricto que TypeScript en JSX. Un comentario entre\n' +
    '  los atributos de una etiqueta es válido para tsc y rechazado por SWC.\n',
)
process.exit(1)
