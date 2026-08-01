#!/usr/bin/env node
/**
 * Busca dos errores de JSX que ya rompieron el build de este proyecto.
 *
 *   npm run check:jsx
 *
 * No depende de ninguna librería, así que corre siempre —a diferencia de
 * `check:syntax`, que necesita @swc/core instalado—.
 *
 * Los dos casos:
 *
 * 1. Comentario entre los atributos de una etiqueta:
 *
 *      <div className="…" /* nota *\/>
 *
 *    Válido para tsc, rechazado por SWC. Rompe el build de Vercel con
 *    "Expected '</', got 'className'".
 *
 * 2. Comentario JSX inmediatamente después de un paréntesis de apertura:
 *
 *      {condicion && (
 *        {/* nota *\/}          ← el paréntesis espera UNA expresión
 *        <section>…
 *
 *    Ahí `{…}` no es un comentario JSX sino un objeto literal, y tsc falla con
 *    "')' expected".
 *
 * En ambos casos el comentario va ENCIMA del elemento, al nivel de sus
 * hermanos.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ok = (text) => `\x1b[32m✔\x1b[0m ${text}`
const fail = (text) => `\x1b[31m✖\x1b[0m ${text}`

const RAIZ = join(process.cwd(), 'src')

function archivos(directorio) {
  return readdirSync(directorio).flatMap((entrada) => {
    const ruta = join(directorio, entrada)
    if (statSync(ruta).isDirectory()) return archivos(ruta)
    return /\.tsx$/.test(entrada) ? [ruta] : []
  })
}

const ABRE_EXPRESION = /(?:&&|\?|=>|return|\?\?)\s*\($/

const hallazgos = []

for (const ruta of archivos(RAIZ)) {
  const lineas = readFileSync(ruta, 'utf8').split('\n')

  lineas.forEach((linea, indice) => {
    // 1 · comentario entre atributos
    if (/<[A-Za-z][^>]*\s\/\*[\s\S]*?\*\/[^>]*>/.test(linea)) {
      hallazgos.push({
        ruta,
        linea: indice + 1,
        aviso: 'comentario entre los atributos de una etiqueta',
        texto: linea.trim(),
      })
    }

    // 2 · comentario JSX pegado a un paréntesis de apertura
    const anterior = lineas[indice - 1]
    if (anterior && ABRE_EXPRESION.test(anterior.trimEnd()) && linea.trim().startsWith('{/*')) {
      hallazgos.push({
        ruta,
        linea: indice + 1,
        aviso: 'comentario JSX justo después de un paréntesis de apertura',
        texto: linea.trim().slice(0, 80),
      })
    }
  })
}

console.log('\nVerificación de JSX\n' + '─'.repeat(64))

if (hallazgos.length === 0) {
  console.log(ok('Sin patrones de JSX que rompan el build.\n'))
  process.exit(0)
}

console.log(fail(`${hallazgos.length} problema(s):\n`))

for (const hallazgo of hallazgos) {
  console.log(`  ${relative(process.cwd(), hallazgo.ruta)}:${hallazgo.linea} — ${hallazgo.aviso}`)
  console.log(`    ${hallazgo.texto}\n`)
}

console.log('  Movés el comentario ENCIMA del elemento, al nivel de sus hermanos.\n')
process.exit(1)
