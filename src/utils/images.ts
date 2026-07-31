import { publicEnv } from '@/lib/env'

/**
 * URL pública de una imagen del bucket `services`.
 *
 * Vive en utils y no en la capa de servicios porque los componentes cliente la
 * necesitan: importar un módulo de `lib/services` desde el navegador arrastra
 * el cliente de servidor de Supabase al bundle y rompe el build.
 */
export function serviceImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null
  return `${publicEnv.supabaseUrl}/storage/v1/object/public/services/${imagePath}`
}
