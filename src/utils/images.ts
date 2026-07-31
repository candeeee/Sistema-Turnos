import { hasSupabaseConfig, publicEnv } from '@/lib/env'

/**
 * URL pública de una imagen del bucket `services`.
 *
 * Vive en utils y no en la capa de servicios porque los componentes cliente la
 * necesitan: importar un módulo de `lib/services` desde el navegador arrastra
 * el cliente de servidor de Supabase al bundle y rompe el build.
 *
 * Devuelve `null` si el entorno no está configurado, en vez de lanzar. Una
 * imagen ausente muestra una tarjeta sin foto; una excepción durante el
 * renderizado tumba la página entera, y una foto no vale eso.
 */
export function serviceImageUrl(imagePath: string | null): string | null {
  if (!imagePath || !hasSupabaseConfig()) return null

  return `${publicEnv.supabaseUrl}/storage/v1/object/public/services/${imagePath}`
}
