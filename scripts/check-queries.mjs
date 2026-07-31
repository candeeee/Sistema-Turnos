#!/usr/bin/env node
/**
 * Busca consultas de Supabase que rompen la inferencia de tipos.
 *
 *   npm run check:queries
 *
 * `supabase-js` deduce la forma de cada respuesta analizando el texto del
 * `select` en tiempo de compilación. Para eso necesita un **literal**: si
 * recibe un `string` armado con variables, plantillas o `.join()`, el parser
 * no puede resolverlo y el resultado queda como un tipo de error. En la
 * práctica eso aparece como cascadas de "does not exist on type 'never'" en
 * archivos que a simple vista están bien.
 *
 * Este control encuentra esos casos antes de que lleguen al build.
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
    return /\.tsx?$/.test(entrada) ? [ruta] : []
  })
}

/** Un select válido empieza con comilla o con un identificador en mayúsculas. */
const SELECT_LITERAL = /^\s*(['"`]|[A-Z_]+\s*[,)])/

const hallazgos = []

for (const ruta of archivos(RAIZ)) {
  const lineas = readFileSync(ruta, 'utf8').split('\n')

  lineas.forEach((linea, indice) => {
    const posicion = linea.indexOf('.select(')
    if (posicion === -1) return

    const argumento = linea.slice(posicion + '.select('.length)

    // `.select()` sin argumentos es válido: devuelve la fila completa.
    if (argumento.trimStart().startsWith(')')) return

    // Una plantilla con interpolación tampoco es literal para el parser.
    if (argumento.includes('${')) {
      hallazgos.push({ ruta, linea: indice + 1, texto: linea.trim() })
      return
    }

    if (!SELECT_LITERAL.test(argumento)) {
      hallazgos.push({ ruta, linea: indice + 1, texto: linea.trim() })
    }
  })
}

console.log('\nVerificación de consultas\n' + '─'.repeat(64))

if (hallazgos.length === 0) {
  console.log(ok('Todos los select() usan literales. La inferencia funciona.\n'))
  process.exit(0)
}

console.log(fail(`${hallazgos.length} select() sin literal:\n`))

for (const hallazgo of hallazgos) {
  console.log(`  ${relative(process.cwd(), hallazgo.ruta)}:${hallazgo.linea}`)
  console.log(`    ${hallazgo.texto}\n`)
}

console.log('  Reemplazalos por una cadena literal, o por una constante con `as const`.')
console.log('  Si el select tiene que variar, declará una constante por cada forma.\n')
process.exit(1)
