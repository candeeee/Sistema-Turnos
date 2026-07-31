import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/domain'
import { DataError } from '@/utils/log'

export async function listBusinessHours(): Promise<Tables<'business_hours'>[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('business_hours')
    .select('*')
    .order('weekday')
    .order('opens_at')

  if (error) {
    throw new DataError('listBusinessHours', error)
  }

  return data
}

/** Feriados, vacaciones y bloqueos vigentes o futuros. */
export async function listScheduleExceptions(): Promise<Tables<'schedule_exceptions'>[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('schedule_exceptions')
    .select('*')
    .gte('ends_at', new Date().toISOString())
    .order('starts_at')

  if (error) {
    throw new DataError('listScheduleExceptions', error)
  }

  return data
}
