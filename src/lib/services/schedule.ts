import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database.types'
import { DataError } from '@/utils/log'

export type BusinessHour = Tables<'business_hours'>

/** Franjas activas agrupadas por día de semana (0 = domingo). */
export const getBusinessHoursByWeekday = cache(
  async (): Promise<Record<number, BusinessHour[]>> => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('business_hours')
      .select('*')
      .eq('is_active', true)
      .order('weekday')
      .order('opens_at')

    if (error) {
      throw new DataError('getBusinessHoursByWeekday', error)
    }

    const grouped: Record<number, BusinessHour[]> = {}
    for (const hour of data) {
      ;(grouped[hour.weekday] ??= []).push(hour)
    }

    return grouped
  },
)
