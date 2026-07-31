'use client'

import { motion } from 'framer-motion'

/**
 * Transición entre páginas.
 *
 * Va en un `template` y no en el layout porque necesita remontarse en cada
 * navegación: un layout persiste y la animación no volvería a dispararse.
 *
 * Es deliberadamente mínima —una aparición con 6px de desplazamiento— porque
 * una transición de página que se nota entorpece la navegación repetida. El
 * `prefers-reduced-motion` la desactiva desde globals.css.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}
