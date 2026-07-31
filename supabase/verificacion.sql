-- ===========================================================================
-- VERIFICACIÓN DE INSTALACIÓN
-- ===========================================================================
-- Ejecutar completo en el SQL Editor de Supabase.
-- Devuelve una fila por cada objeto que la aplicación necesita, con su estado.
--
-- Cualquier fila en ❌ FALTA significa que el código va a fallar en tiempo de
-- ejecución: la aplicación llama a algo que no existe en esta base.
--
-- Este script NO modifica nada. Es solo lectura.
-- ===========================================================================

with esperado as (

  -- ---------------------------------------------------------------------
  -- Tipos enumerados
  -- ---------------------------------------------------------------------
  select 'enum' as tipo, 'user_role' as objeto,
         exists (select 1 from pg_type where typname = 'user_role') as existe
  union all select 'enum', 'appointment_status',
         exists (select 1 from pg_type where typname = 'appointment_status')
  union all select 'enum', 'schedule_exception_type',
         exists (select 1 from pg_type where typname = 'schedule_exception_type')
  union all select 'enum', 'reminder_kind',
         exists (select 1 from pg_type where typname = 'reminder_kind')
  union all select 'enum', 'reminder_status',
         exists (select 1 from pg_type where typname = 'reminder_status')

  -- ---------------------------------------------------------------------
  -- Tablas
  -- ---------------------------------------------------------------------
  union all select 'tabla', t.tabla,
         exists (
           select 1 from pg_tables
           where schemaname = 'public' and tablename = t.tabla
         )
  from (values
    ('profiles'), ('clients'), ('services'), ('business_settings'),
    ('business_hours'), ('schedule_exceptions'), ('appointments'),
    ('internal_notes'), ('appointment_status_history'),
    ('appointment_reminders'), ('booking_attempts')
  ) as t(tabla)

  -- ---------------------------------------------------------------------
  -- Funciones que Next.js llama por RPC (la firma tiene que coincidir)
  -- ---------------------------------------------------------------------
  union all select 'función', f.firma,
         exists (
           select 1
           from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public'
             and p.proname = f.nombre
             and pg_get_function_identity_arguments(p.oid) = f.args
         )
  from (values
    ('is_admin',                    '',                              'is_admin()'),
    ('current_client_id',           '',                              'current_client_id()'),
    ('get_available_slots',         'p_service_id uuid, p_date date','get_available_slots(uuid, date)'),
    ('get_available_days',          'p_service_id uuid, p_from date, p_to date', 'get_available_days(uuid, date, date)'),
    ('book_appointment',            'p_service_id uuid, p_starts_at timestamp with time zone, p_client_notes text', 'book_appointment(uuid, timestamptz, text)'),
    ('cancel_appointment',          'p_appointment_id uuid, p_reason text', 'cancel_appointment(uuid, text)'),
    ('reschedule_appointment',      'p_appointment_id uuid, p_new_starts_at timestamp with time zone', 'reschedule_appointment(uuid, timestamptz)'),
    ('expire_pending_appointments', '',                              'expire_pending_appointments()'),
    ('get_due_reminders',           'p_limit integer',               'get_due_reminders(integer)'),
    ('mark_reminder_sent',          'p_reminder_id uuid, p_success boolean, p_error text', 'mark_reminder_sent(uuid, boolean, text)'),
    ('promote_to_admin',            'p_email text',                  'promote_to_admin(text)'),
    ('admin_dashboard_stats',       '',                              'admin_dashboard_stats()'),
    ('admin_list_clients',          'p_search text, p_limit integer, p_offset integer', 'admin_list_clients(text, integer, integer)')
  ) as f(nombre, args, firma)

  -- ---------------------------------------------------------------------
  -- Triggers
  -- ---------------------------------------------------------------------
  union all select 'trigger', g.trigger_name,
         exists (
           select 1 from pg_trigger
           where not tgisinternal and tgname = g.trigger_name
         )
  from (values
    ('on_auth_user_created'), ('profiles_protect_role'), ('clients_protect_link'),
    ('business_settings_validate'), ('business_hours_validate'),
    ('appointments_compute_end'), ('appointments_guard_transition'),
    ('appointments_log_status'), ('appointments_sync_reminder')
  ) as g(trigger_name)

  -- ---------------------------------------------------------------------
  -- Constraint que impide el doble turno
  -- ---------------------------------------------------------------------
  union all select 'constraint', 'appointments_no_overlap',
         exists (
           select 1 from pg_constraint where conname = 'appointments_no_overlap'
         )

  -- ---------------------------------------------------------------------
  -- Extensión necesaria para ese constraint
  -- ---------------------------------------------------------------------
  union all select 'extensión', 'btree_gist',
         exists (select 1 from pg_extension where extname = 'btree_gist')

  -- ---------------------------------------------------------------------
  -- Bucket de imágenes
  -- ---------------------------------------------------------------------
  union all select 'storage', 'bucket services',
         exists (select 1 from storage.buckets where id = 'services')

  -- ---------------------------------------------------------------------
  -- Fila única de configuración
  -- ---------------------------------------------------------------------
  union all select 'datos', 'fila en business_settings',
         exists (select 1 from public.business_settings)
)
select
  tipo,
  objeto,
  case when existe then '✅ OK' else '❌ FALTA' end as estado
from esperado
order by (case when existe then 1 else 0 end), tipo, objeto;

-- ===========================================================================
-- 2 · RLS activo en todas las tablas
-- ===========================================================================

select
  c.relname as tabla,
  case when c.relrowsecurity then '✅ RLS activo' else '❌ RLS APAGADO' end as rls,
  count(p.policyname)::text || ' policies' as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = 'public' and p.tablename = c.relname
where n.nspname = 'public' and c.relkind = 'r'
group by c.relname, c.relrowsecurity
order by c.relrowsecurity, c.relname;

-- ===========================================================================
-- 3 · Permisos de ejecución de las funciones
-- ===========================================================================
-- `anon` tiene que poder ejecutar is_admin(), get_available_slots() y
-- get_available_days(): el sitio público las usa sin sesión iniciada.

select
  p.proname as funcion,
  coalesce(string_agg(distinct r.rolname, ', ' order by r.rolname), '(nadie)') as puede_ejecutar
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
left join pg_roles r
  on r.rolname in ('anon', 'authenticated', 'service_role')
 and has_function_privilege(r.rolname, p.oid, 'EXECUTE')
where n.nspname = 'public'
  and p.proname in (
    'is_admin', 'current_client_id', 'get_available_slots', 'get_available_days',
    'book_appointment', 'cancel_appointment', 'reschedule_appointment',
    'admin_dashboard_stats', 'admin_list_clients',
    'expire_pending_appointments', 'get_due_reminders', 'mark_reminder_sent'
  )
group by p.proname
order by p.proname;

-- ===========================================================================
-- 4 · Administradores actuales
-- ===========================================================================

select u.email, p.role, p.created_at
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'admin';

-- ===========================================================================
-- 5 · Prueba en caliente del motor de disponibilidad
-- ===========================================================================
-- Si devuelve 0 filas con servicios activos y horarios cargados, el problema
-- está en business_hours, en la zona horaria o en min_hours_before_booking.

select
  s.name as servicio,
  (select count(*) from public.get_available_slots(s.id, current_date + 1)) as slots_manana
from public.services s
where s.is_active;
