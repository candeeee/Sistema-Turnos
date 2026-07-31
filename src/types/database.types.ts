/**
 * Tipos del esquema `public`.
 *
 * Este archivo refleja exactamente las migraciones de /supabase/migrations.
 * Después de cualquier cambio en el esquema, regeneralo:
 *
 *   npm run db:types
 *
 * No lo edites a mano salvo que estés agregando la migración correspondiente
 * en el mismo commit.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: UserRole
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: UserRole
        }
        Update: {
          role?: UserRole
        }
        Relationships: []
      }

      clients: {
        Row: {
          id: string
          user_id: string | null
          full_name: string
          email: string | null
          phone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          full_name: string
          email?: string | null
          phone: string
        }
        Update: {
          user_id?: string | null
          full_name?: string
          email?: string | null
          phone?: string
        }
        Relationships: []
      }

      services: {
        Row: {
          id: string
          name: string
          slug: string
          description: string
          duration_min: number
          buffer_min: number
          price: number
          image_path: string | null
          is_active: boolean
          is_featured: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string
          duration_min: number
          buffer_min?: number
          price: number
          image_path?: string | null
          is_active?: boolean
          is_featured?: boolean
          sort_order?: number
        }
        Update: {
          name?: string
          slug?: string
          description?: string
          duration_min?: number
          buffer_min?: number
          price?: number
          image_path?: string | null
          is_active?: boolean
          is_featured?: boolean
          sort_order?: number
        }
        Relationships: []
      }

      business_settings: {
        Row: {
          id: boolean
          name: string
          phone: string
          whatsapp: string
          email: string
          address: string
          maps_url: string | null
          instagram: string
          facebook: string
          timezone: string
          slot_interval_min: number
          min_hours_before_booking: number
          max_days_ahead: number
          min_hours_before_cancel: number
          hold_hours: number
          reminder_hours_before: number
          max_pending_per_client: number
          max_bookings_per_hour: number
          deposit_percentage: number
          deposit_alias: string
          deposit_cbu: string
          deposit_instructions: string
          booking_notice: string
          cancellation_policy: string
          reminders_enabled: boolean
          second_reminder_enabled: boolean
          second_reminder_hours: number
          message_reminder: string
          message_confirmation: string
          message_cancellation: string
          message_status_change: string
          updated_at: string
        }
        Insert: never
        Update: Partial<Omit<Database['public']['Tables']['business_settings']['Row'], 'id' | 'updated_at'>>
        Relationships: []
      }

      business_hours: {
        Row: {
          id: string
          weekday: number
          opens_at: string
          closes_at: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          weekday: number
          opens_at: string
          closes_at: string
          is_active?: boolean
        }
        Update: {
          weekday?: number
          opens_at?: string
          closes_at?: string
          is_active?: boolean
        }
        Relationships: []
      }

      schedule_exceptions: {
        Row: {
          id: string
          type: ScheduleExceptionType
          starts_at: string
          ends_at: string
          reason: string
          created_at: string
        }
        Insert: {
          id?: string
          type: ScheduleExceptionType
          starts_at: string
          ends_at: string
          reason?: string
        }
        Update: {
          type?: ScheduleExceptionType
          starts_at?: string
          ends_at?: string
          reason?: string
        }
        Relationships: []
      }

      appointments: {
        Row: {
          id: string
          client_id: string
          service_id: string
          starts_at: string
          ends_at: string
          status: AppointmentStatus
          price_snapshot: number
          duration_min_snapshot: number
          buffer_min_snapshot: number
          deposit_percentage_snapshot: number
          deposit_amount_snapshot: number
          client_notes: string
          cancellation_reason: string | null
          hold_expires_at: string | null
          rescheduled_from_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          service_id: string
          starts_at: string
          ends_at?: string
          status?: AppointmentStatus
          price_snapshot: number
          duration_min_snapshot: number
          buffer_min_snapshot?: number
          deposit_percentage_snapshot: number
          deposit_amount_snapshot: number
          client_notes?: string
          hold_expires_at?: string | null
          rescheduled_from_id?: string | null
          created_by?: string | null
        }
        Update: {
          service_id?: string
          starts_at?: string
          status?: AppointmentStatus
          client_notes?: string
          cancellation_reason?: string | null
          hold_expires_at?: string | null
        }
        Relationships: [
          { foreignKeyName: 'appointments_client_id_fkey'; columns: ['client_id']; referencedRelation: 'clients'; referencedColumns: ['id'] },
          { foreignKeyName: 'appointments_service_id_fkey'; columns: ['service_id']; referencedRelation: 'services'; referencedColumns: ['id'] },
        ]
      }

      internal_notes: {
        Row: {
          id: string
          client_id: string
          appointment_id: string | null
          body: string
          author_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          appointment_id?: string | null
          body: string
          author_id?: string | null
        }
        Update: {
          body?: string
          appointment_id?: string | null
        }
        Relationships: [
          { foreignKeyName: 'internal_notes_client_id_fkey'; columns: ['client_id']; referencedRelation: 'clients'; referencedColumns: ['id'] },
        ]
      }

      appointment_status_history: {
        Row: {
          id: number
          appointment_id: string
          from_status: AppointmentStatus | null
          to_status: AppointmentStatus
          changed_by: string | null
          reason: string | null
          created_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }

      appointment_reminders: {
        Row: {
          id: string
          appointment_id: string
          kind: ReminderKind
          scheduled_for: string
          status: ReminderStatus
          attempts: number
          sent_at: string | null
          last_error: string | null
          created_at: string
          updated_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }

      booking_attempts: {
        Row: {
          id: number
          user_id: string
          created_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
    }

    Views: Record<never, never>

    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      current_client_id: {
        Args: Record<string, never>
        Returns: string | null
      }
      get_available_slots: {
        Args: { p_service_id: string; p_date: string }
        Returns: { slot_start: string; slot_end: string }[]
      }
      book_appointment: {
        Args: { p_service_id: string; p_starts_at: string; p_client_notes?: string }
        Returns: string
      }
      cancel_appointment: {
        Args: { p_appointment_id: string; p_reason?: string }
        Returns: undefined
      }
      reschedule_appointment: {
        Args: { p_appointment_id: string; p_new_starts_at: string }
        Returns: string
      }
      expire_pending_appointments: {
        Args: Record<string, never>
        Returns: number
      }
      get_due_reminders: {
        Args: { p_limit?: number }
        Returns: {
          reminder_id: string
          appointment_id: string
          kind: ReminderKind
          client_name: string
          client_phone: string
          client_email: string | null
          service_name: string
          starts_at: string
          business_name: string
          business_tz: string
          template: string
        }[]
      }
      mark_reminder_sent: {
        Args: { p_reminder_id: string; p_success: boolean; p_error?: string | null }
        Returns: undefined
      }
      promote_to_admin: {
        Args: { p_email: string }
        Returns: string
      }
      admin_dashboard_stats: {
        Args: Record<string, never>
        Returns: DashboardStats
      }
      check_status_guard: {
        Args: Record<string, never>
        Returns: boolean
      }
      admin_appointments_duration_drift: {
        Args: Record<string, never>
        Returns: {
          appointment_id: string
          starts_at: string
          client_name: string
          service_name: string
          duracion_turno: number
          duracion_servicio: number
        }[]
      }
      admin_list_clients: {
        Args: { p_search?: string; p_limit?: number; p_offset?: number }
        Returns: ClientSummary[]
      }
    }

    Enums: {
      user_role: UserRole
      appointment_status: AppointmentStatus
      schedule_exception_type: ScheduleExceptionType
      reminder_kind: ReminderKind
      reminder_status: ReminderStatus
    }

    CompositeTypes: Record<never, never>
  }
}

export type UserRole = 'client' | 'admin'

export type AppointmentStatus =
  | 'pending_confirmation'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled_by_client'
  | 'cancelled_by_business'
  | 'rescheduled'
  | 'no_show'

export type ScheduleExceptionType = 'holiday' | 'vacation' | 'block'

export type ReminderKind = 'appointment_24h' | 'appointment_second'

export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'cancelled'

/** Atajos para no repetir Database['public']['Tables'][...] en todo el código. */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

/** Estructura del JSON que devuelve `admin_dashboard_stats()`. */
export type DashboardStats = {
  today: number
  tomorrow: number
  week: number
  pendingDeposit: number
  clients: number
  newClientsMonth: number
  completedMonth: number
  topServices: { name: string; total: number }[]
}

/** Fila de `admin_list_clients()`. */
export type ClientSummary = {
  id: string
  full_name: string
  email: string | null
  phone: string
  created_at: string
  total_appointments: number
  completed_count: number
  no_show_count: number
  upcoming_count: number
  last_visit: string | null
}
