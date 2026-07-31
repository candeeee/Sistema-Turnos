import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/domain'
import { DataError } from '@/utils/log'

export type Service = Tables<'services'>

/**
 * Servicios activos, en el orden definido por el administrador.
 * RLS ya filtra los inactivos para el público; el `eq` explícito evita que un
 * administrador logueado vea el catálogo con servicios apagados donde no debe.
 */
export const getActiveServices = cache(async (): Promise<Service[]> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
    .order('name')

  if (error) {
    throw new DataError('getActiveServices', error)
  }

  return data
})

export const getFeaturedServices = cache(async (): Promise<Service[]> => {
  const services = await getActiveServices()
  const featured = services.filter((service) => service.is_featured)

  // Si el administrador todavía no destacó ninguno, la portada muestra los
  // primeros del catálogo en lugar de una sección vacía.
  return featured.length > 0 ? featured : services.slice(0, 3)
})

export const getServiceBySlug = cache(async (slug: string): Promise<Service | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    throw new DataError('getServiceBySlug', error, { slug })
  }

  return data
})
