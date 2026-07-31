#!/usr/bin/env node
/**
 * Busca patrones que provocan desborde horizontal en celular.
 *
 *   npm run check:responsive
 *
 * El origen del problema casi siempre es el mismo: en CSS, un hijo de flex o
 * de grid tiene `min-width: auto` por defecto, así que **se niega a encogerse
 * por debajo del ancho de su contenido**. Una tabla ancha, un email largo o
 * un input de fecha adentro estiran el contenedor, y de ahí la página entera.
 *
 * La solución es `min-w-0` en el contenedor que debe ceder. Este control
 * marca los lugares donde falta.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ok = (text) => `\x1b[32m✔\x1b[0m ${text}`
const warn = (text) => `\x1b[33m▲\x1b[0m ${text}`

const RAIZ = join(process.cwd(), 'src')

function archivos(directorio) {
  return readdirSync(directorio).flatMap((entrada) => {
    const ruta = join(directorio, entrada)
    if (statSync(ruta).isDirectory()) return archivos(ruta)
    return /\.tsx$/.test(entrada) ? [ruta] : []
  })
}

const REGLAS = [
  {
    // Un ancho mínimo grande sin variante responsive no entra en 360px.
    // Se acepta si el contenedor declara scroll propio o si está justificado
    // con un comentario `responsive-ok` en la línea anterior.
    patron: /min-w-(\[(?:[4-9]\d{2}|\d{4,})px\]|\d{2,})/,
    excepcion: /sm:|md:|lg:|responsive-ok/,
    aviso: 'ancho mínimo grande sin variante responsive',
  },
  {
    // overflow-x-auto solo contiene si el propio elemento puede encogerse.
    patron: /overflow-x-auto/,
    excepcion: /min-w-0/,
    aviso: 'overflow-x-auto sin min-w-0: no va a contener el scroll',
  },
  {
    // Anchos fijos grandes en elementos que no son iconos.
    patron: /\bw-(4[0-9]|[5-9][0-9])\b/,
    excepcion: /sm:w-|max-w-|shrink-0.*truncate|truncate.*shrink-0/,
    aviso: 'ancho fijo grande sin variante responsive ni truncado',
  },
]

const hallazgos = []

for (const ruta of archivos(RAIZ)) {
  readFileSync(ruta, 'utf8')
    .split('\n')
    .forEach((linea, indice) => {
      // Los comentarios explican decisiones; no son código a revisar.
      const limpia = linea.trim()
      if (limpia.startsWith('//') || limpia.startsWith('*') || limpia.startsWith('{/*')) return

      for (const regla of REGLAS) {
        if (regla.patron.test(linea) && !regla.excepcion.test(linea)) {
          hallazgos.push({ ruta, linea: indice + 1, aviso: regla.aviso, texto: linea.trim() })
        }
      }
    })
}

console.log('\nVerificación de diseño responsive\n' + '─'.repeat(64))

if (hallazgos.length === 0) {
  console.log(ok('Sin patrones de desborde horizontal.\n'))
  process.exit(0)
}

console.log(warn(`${hallazgos.length} punto(s) a revisar:\n`))

for (const hallazgo of hallazgos) {
  console.log(`  ${relative(process.cwd(), hallazgo.ruta)}:${hallazgo.linea} — ${hallazgo.aviso}`)
  console.log(`    ${hallazgo.texto.slice(0, 110)}\n`)
}

console.log('  Son avisos, no errores: revisá cada uno en un celular real.\n')
