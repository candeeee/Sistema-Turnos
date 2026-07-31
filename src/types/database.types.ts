/**
 * Tipos del esquema `public`.
 *
 * ⚠️ ARCHIVO GENERADO — no editar a mano.
 *
 *   npm run db:types
 *
 * Los tipos propios del dominio (estados, métricas del panel, atajos) NO van
 * acá: viven en `src/types/domain.ts`, que deriva de este archivo. Esa
 * separación es la que permite regenerar sin borrar código escrito a mano,
 * que fue exactamente lo que llevó a que este archivo se editara a mano y
 * dejara de describir la base.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      appointment_reminders: {
        Row: {
          appointment_id: string
          attempts: number
          created_at: string
          id: string
          kind: Database['public']['Enums']['reminder_kind']
          last_error: string | null
          scheduled_for: string
          sent_at: string | null
          status: Database['public']['Enums']['reminder_status']
          updated_at: string
        }
        Insert: {
          appointment_id: string
          attempts?: number
          created_at?: string
          id?: string
          kind?: Database['public']['Enums']['reminder_kind']
          last_error?: string | null
          scheduled_for: string
          sent_at?: string | null
          status?: Database['public']['Enums']['reminder_status']
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          attempts?: number
          created_at?: string
          id?: string
          kind?: Database['public']['Enums']['reminder_kind']
          last_error?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: Database['public']['Enums']['reminder_status']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'appointment_reminders_appointment_id_fkey'
            columns: ['appointment_id']
            isOneToOne: false
            referencedRelation: 'appointments'
            referencedColumns: ['id']
          },
        ]
      }
      appointment_status_history: {
        Row: {
          appointment_id: string
          changed_by: string | null
          created_at: string
          from_status: Database['public']['Enums']['appointment_status'] | null
          id: number
          reason: string | null
          to_status: Database['public']['Enums']['appointment_status']
        }
        Insert: {
          appointment_id: string
          changed_by?: string | null
          created_at?: string
          from_status?: Database['public']['Enums']['appointment_status'] | null
          id?: never
          reason?: string | null
          to_status: Database['public']['Enums']['appointment_status']
        }
        Update: {
          appointment_id?: string
          changed_by?: string | null
          created_at?: string
          from_status?: Database['public']['Enums']['appointment_status'] | null
          id?: never
          reason?: string | null
          to_status?: Database['public']['Enums']['appointment_status']
        }
        Relationships: [
          {
            foreignKeyName: 'appointment_status_history_appointment_id_fkey'
            columns: ['appointment_id']
            isOneToOne: false
            referencedRelation: 'appointments'
            referencedColumns: ['id']
          },
        ]
      }
      appointments: {
        Row: {
          buffer_min_snapshot: number
          cancellation_reason: string | null
          client_id: string
          client_notes: string
          created_at: string
          created_by: string | null
          deposit_amount_snapshot: number
          deposit_percentage_snapshot: number
          duration_min_snapshot: number
          ends_at: string
          hold_expires_at: string | null
          id: string
          price_snapshot: number
          rescheduled_from_id: string | null
          service_id: string
          starts_at: string
          status: Database['public']['Enums']['appointment_status']
          updated_at: string
        }
        Insert: {
          buffer_min_snapshot?: number
          cancellation_reason?: string | null
          client_id: string
          client_notes?: string
          created_at?: string
          created_by?: string | null
          deposit_amount_snapshot: number
          deposit_percentage_snapshot: number
          duration_min_snapshot: number
          ends_at?: string
          hold_expires_at?: string | null
          id?: string
          price_snapshot: number
          rescheduled_from_id?: string | null
          service_id: string
          starts_at: string
          status?: Database['public']['Enums']['appointment_status']
          updated_at?: string
        }
        Update: {
          buffer_min_snapshot?: number
          cancellation_reason?: string | null
          client_id?: string
          client_notes?: string
          created_at?: string
          created_by?: string | null
          deposit_amount_snapshot?: number
          deposit_percentage_snapshot?: number
          duration_min_snapshot?: number
          ends_at?: string
          hold_expires_at?: string | null
          id?: string
          price_snapshot?: number
          rescheduled_from_id?: string | null
          service_id?: string
          starts_at?: string
          status?: Database['public']['Enums']['appointment_status']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'appointments_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointments_rescheduled_from_id_fkey'
            columns: ['rescheduled_from_id']
            isOneToOne: true
            referencedRelation: 'appointments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointments_service_id_fkey'
            columns: ['service_id']
            isOneToOne: false
            referencedRelation: 'services'
            referencedColumns: ['id']
          },
        ]
      }
      booking_attempts: {
        Row: {
          created_at: string
          id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          user_id?: string
        }
        Relationships: []
      }
      business_hours: {
        Row: {
          closes_at: string
          created_at: string
          id: string
          is_active: boolean
          opens_at: string
          weekday: number
        }
        Insert: {
          closes_at: string
          created_at?: string
          id?: string
          is_active?: boolean
          opens_at: string
          weekday: number
        }
        Update: {
          closes_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          opens_at?: string
          weekday?: number
        }
        Relationships: []
      }
      business_settings: {
        Row: {
          address: string
          booking_notice: string
          cancellation_policy: string
          deposit_alias: string
          deposit_cbu: string
          deposit_instructions: string
          deposit_percentage: number
          email: string
          facebook: string
          hold_hours: number
          id: boolean
          instagram: string
          maps_url: string | null
          max_bookings_per_hour: number
          max_days_ahead: number
          max_pending_per_client: number
          message_cancellation: string
          message_confirmation: string
          message_reminder: string
          message_status_change: string
          min_hours_before_booking: number
          min_hours_before_cancel: number
          name: string
          phone: string
          reminder_hours_before: number
          reminders_enabled: boolean
          second_reminder_enabled: boolean
          second_reminder_hours: number
          slot_interval_min: number
          timezone: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          address?: string
          booking_notice?: string
          cancellation_policy?: string
          deposit_alias?: string
          deposit_cbu?: string
          deposit_instructions?: string
          deposit_percentage?: number
          email?: string
          facebook?: string
          hold_hours?: number
          id?: boolean
          instagram?: string
          maps_url?: string | null
          max_bookings_per_hour?: number
          max_days_ahead?: number
          max_pending_per_client?: number
          message_cancellation?: string
          message_confirmation?: string
          message_reminder?: string
          message_status_change?: string
          min_hours_before_booking?: number
          min_hours_before_cancel?: number
          name?: string
          phone?: string
          reminder_hours_before?: number
          reminders_enabled?: boolean
          second_reminder_enabled?: boolean
          second_reminder_hours?: number
          slot_interval_min?: number
          timezone?: string
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          address?: string
          booking_notice?: string
          cancellation_policy?: string
          deposit_alias?: string
          deposit_cbu?: string
          deposit_instructions?: string
          deposit_percentage?: number
          email?: string
          facebook?: string
          hold_hours?: number
          id?: boolean
          instagram?: string
          maps_url?: string | null
          max_bookings_per_hour?: number
          max_days_ahead?: number
          max_pending_per_client?: number
          message_cancellation?: string
          message_confirmation?: string
          message_reminder?: string
          message_status_change?: string
          min_hours_before_booking?: number
          min_hours_before_cancel?: number
          name?: string
          phone?: string
          reminder_hours_before?: number
          reminders_enabled?: boolean
          second_reminder_enabled?: boolean
          second_reminder_hours?: number
          slot_interval_min?: number
          timezone?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      internal_notes: {
        Row: {
          appointment_id: string | null
          author_id: string | null
          body: string
          client_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          author_id?: string | null
          body: string
          client_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          author_id?: string | null
          body?: string
          client_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'internal_notes_appointment_id_fkey'
            columns: ['appointment_id']
            isOneToOne: false
            referencedRelation: 'appointments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'internal_notes_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          role: Database['public']['Enums']['user_role']
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          role?: Database['public']['Enums']['user_role']
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database['public']['Enums']['user_role']
          updated_at?: string
        }
        Relationships: []
      }
      schedule_exceptions: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          reason: string
          starts_at: string
          type: Database['public']['Enums']['schedule_exception_type']
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          reason?: string
          starts_at: string
          type: Database['public']['Enums']['schedule_exception_type']
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          reason?: string
          starts_at?: string
          type?: Database['public']['Enums']['schedule_exception_type']
        }
        Relationships: []
      }
      services: {
        Row: {
          buffer_min: number
          created_at: string
          description: string
          duration_min: number
          id: string
          image_path: string | null
          is_active: boolean
          is_featured: boolean
          name: string
          price: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          buffer_min?: number
          created_at?: string
          description?: string
          duration_min: number
          id?: string
          image_path?: string | null
          is_active?: boolean
          is_featured?: boolean
          name: string
          price: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          buffer_min?: number
          created_at?: string
          description?: string
          duration_min?: number
          id?: string
          image_path?: string | null
          is_active?: boolean
          is_featured?: boolean
          name?: string
          price?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_appointments_duration_drift: {
        Args: Record<PropertyKey, never>
        Returns: {
          appointment_id: string
          client_name: string
          duracion_servicio: number
          duracion_turno: number
          service_name: string
          starts_at: string
        }[]
      }
      admin_dashboard_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      admin_list_clients: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: {
          completed_count: number
          created_at: string
          email: string
          full_name: string
          id: string
          last_visit: string
          no_show_count: number
          phone: string
          total_appointments: number
          upcoming_count: number
        }[]
      }
      book_appointment: {
        Args: { p_client_notes?: string; p_service_id: string; p_starts_at: string }
        Returns: string
      }
      cancel_appointment: {
        Args: { p_appointment_id: string; p_reason?: string }
        Returns: undefined
      }
      check_status_guard: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      current_client_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      expire_pending_appointments: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_available_days: {
        Args: { p_from: string; p_service_id: string; p_to: string }
        Returns: {
          day: string
          slot_count: number
        }[]
      }
      get_available_slots: {
        Args: { p_date: string; p_service_id: string }
        Returns: {
          slot_end: string
          slot_start: string
        }[]
      }
      get_due_reminders: {
        Args: { p_limit?: number }
        Returns: {
          appointment_id: string
          business_name: string
          business_tz: string
          client_email: string
          client_name: string
          client_phone: string
          kind: Database['public']['Enums']['reminder_kind']
          reminder_id: string
          service_name: string
          starts_at: string
          template: string
        }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_terminal_status: {
        Args: { p_status: Database['public']['Enums']['appointment_status'] }
        Returns: boolean
      }
      mark_reminder_sent: {
        Args: { p_error?: string; p_reminder_id: string; p_success: boolean }
        Returns: undefined
      }
      promote_to_admin: {
        Args: { p_email: string }
        Returns: string
      }
      reschedule_appointment: {
        Args: { p_appointment_id: string; p_new_starts_at: string }
        Returns: string
      }
    }
    Enums: {
      appointment_status:
        | 'pending_confirmation'
        | 'confirmed'
        | 'in_progress'
        | 'completed'
        | 'cancelled_by_client'
        | 'cancelled_by_business'
        | 'rescheduled'
        | 'no_show'
      reminder_kind: 'appointment_24h' | 'appointment_second'
      reminder_status: 'pending' | 'sent' | 'failed' | 'cancelled'
      schedule_exception_type: 'holiday' | 'vacation' | 'block'
      user_role: 'client' | 'admin'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
