import type { NextConfig } from 'next'

/**
 * La URL de Supabase se lee acá para autorizar el dominio de las imágenes de
 * Storage. Si falta, se omite la configuración de imágenes en lugar de lanzar:
 * un throw en la carga del config rompe herramientas que importan este archivo
 * sin un `.env` presente (linters, tests, el propio `next build` en CI antes de
 * inyectar las variables). La validación real vive en `src/lib/env.ts`, que
 * falla con un mensaje claro en la primera request.
 */
const supabaseHostname = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    return url ? new URL(url).hostname : null
  } catch {
    return null
  }
})()

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: 'https',
            hostname: supabaseHostname,
            pathname: '/storage/v1/object/public/**',
          },
        ]
      : [],
    formats: ['image/avif', 'image/webp'],
  },
  // `typedRoutes` queda desactivado a propósito: tipa `href` como una unión de
  // rutas literales y rompe cualquier link construido con template string
  // (`/admin/clientes/${id}`), que es la forma correcta de enlazar rutas
  // dinámicas. El tipado de los parámetros de ruta ya cubre ese riesgo.
}

export default nextConfig
