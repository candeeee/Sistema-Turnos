-- ===========================================================================
-- 07 · Correcciones de la auditoría
-- ===========================================================================
-- Esta migración es idempotente y se aplica sobre cualquier estado en el que
-- esté la base, incluido uno con correcciones manuales previas.
-- No modifica ninguna migración anterior: las corrige recreando los objetos.
--
-- Qué resuelve:
--   A · Cast del enum reminder_status (error "expression is of type text")
--   B · Referencia de tres niveles inválida en ON CONFLICT DO UPDATE
--   C · anon sin permiso sobre is_admin() → sitio público caído sin sesión
--   D · Funciones del panel ausentes (admin_dashboard_stats, admin_list_clients)
--   E · Grants explícitos de todas las funciones que usa la aplicación
--   F · Campos operativos que faltaban en la configuración del negocio
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- F · Configuración: campos operativos nuevos
-- ---------------------------------------------------------------------------
-- Política de cancelación como texto (el número de horas ya existía) y
-- interruptor de recordatorios, para poder apagarlos mientras no hay canal
-- de envío conectado.

alter table public.business_settings
  add column if not exists cancellation_policy text not null default '';

alter table public.business_settings
  add column if not exists reminders_enabled boolean not null default true;

comment on column public.business_settings.cancellation_policy is
  'Texto que se muestra al cliente al reservar y en Mi cuenta.';
comment on column public.business_settings.reminders_enabled is
  'Si está en false, el trigger deja de encolar recordatorios nuevos.';

-- ---------------------------------------------------------------------------
-- A + B · Trigger de recordatorios
-- ---------------------------------------------------------------------------
-- Dos defectos en la misma función:
--
-- 1. Un literal suelto ('pending') tiene tipo `unknown` y PostgreSQL lo
--    convierte al tipo de la columna. Pero un CASE con dos literales resuelve
--    a `text`, y text → enum no tiene conversión implícita. De ahí venía
--    "column status is of type reminder_status but expression is of type text".
--
-- 2. Dentro de ON CONFLICT DO UPDATE la tabla destino se referencia por su
--    nombre sin esquema: `public.appointment_reminders.status` provoca
--    "missing FROM-clause entry for table public".

create or replace function public.appointments_sync_reminder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hours   integer;
  v_enabled boolean;
  v_when    timestamptz;
  v_status  public.reminder_status;
begin
  select reminder_hours_before, reminders_enabled
    into v_hours, v_enabled
    from public.business_settings
   where id = true;

  v_when := new.starts_at - make_interval(hours => v_hours);

  -- El estado se resuelve en una variable ya tipada: no queda ningún CASE
  -- devolviendo text contra una columna enum.
  if v_when > now() and v_enabled then
    v_status := 'pending';
  else
    v_status := 'cancelled';
  end if;

  if new.status in ('pending_confirmation', 'confirmed') then
    insert into public.appointment_reminders (appointment_id, scheduled_for, status)
    values (new.id, v_when, v_status)
    on conflict (appointment_id, kind) do update
      set scheduled_for = excluded.scheduled_for,
          -- Un recordatorio ya enviado no vuelve a la cola.
          status = case
                     when appointment_reminders.status = 'sent' then appointment_reminders.status
                     else excluded.status
                   end;
  else
    update public.appointment_reminders
       set status = 'cancelled'
     where appointment_id = new.id
       and status = 'pending';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- A · Mismo cast en el registro de envíos
-- ---------------------------------------------------------------------------

create or replace function public.mark_reminder_sent(
  p_reminder_id uuid,
  p_success     boolean,
  p_error       text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.appointment_reminders
     set status     = (case when p_success then 'sent' else 'failed' end)::public.reminder_status,
         sent_at    = case when p_success then now() else sent_at end,
         attempts   = attempts + 1,
         last_error = p_error
   where id = p_reminder_id;
$$;

-- ---------------------------------------------------------------------------
-- C · Policy de servicios separada por audiencia
-- ---------------------------------------------------------------------------
-- La policy anterior evaluaba is_admin() también para visitantes sin sesión:
--
--   using (is_active or public.is_admin())
--
-- PostgreSQL no garantiza cortocircuitar el OR, así que un visitante anónimo
-- terminaba recibiendo "permission denied for function is_admin".
-- Separar por rol elimina el problema de raíz y además evita una llamada a
-- función por fila en el camino más transitado del sitio.

drop policy if exists "services_select_active" on public.services;
drop policy if exists "services_select_public" on public.services;
drop policy if exists "services_select_admin" on public.services;

create policy "services_select_public"
  on public.services for select
  to anon, authenticated
  using (is_active);

create policy "services_select_admin"
  on public.services for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- D · Funciones del panel
-- ---------------------------------------------------------------------------
-- Se recrean acá porque la verificación mostró que no están en la base: la
-- migración 06 no llegó a aplicarse. Sin ellas el dashboard devuelve ceros y
-- el listado de clientes queda vacío.

create or replace function public.admin_dashboard_stats()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz    text;
  v_today date;
  v_stats json;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede ver estas estadísticas.' using errcode = '42501';
  end if;

  select timezone into v_tz from public.business_settings where id = true;
  v_today := (now() at time zone v_tz)::date;

  select json_build_object(
    'today', (
      select count(*) from public.appointments
      where (starts_at at time zone v_tz)::date = v_today
        and status in ('pending_confirmation', 'confirmed', 'in_progress')
    ),
    'tomorrow', (
      select count(*) from public.appointments
      where (starts_at at time zone v_tz)::date = v_today + 1
        and status in ('pending_confirmation', 'confirmed', 'in_progress')
    ),
    'week', (
      select count(*) from public.appointments
      where (starts_at at time zone v_tz)::date between v_today and v_today + 6
        and status in ('pending_confirmation', 'confirmed', 'in_progress')
    ),
    'pendingDeposit', (
      select count(*) from public.appointments
      where status = 'pending_confirmation' and starts_at > now()
    ),
    'clients', (select count(*) from public.clients),
    'newClientsMonth', (
      select count(*) from public.clients
      where created_at >= date_trunc('month', now() at time zone v_tz)
    ),
    'completedMonth', (
      select count(*) from public.appointments
      where status = 'completed'
        and starts_at >= date_trunc('month', now() at time zone v_tz)
    ),
    'topServices', coalesce((
      select json_agg(row_to_json(t))
      from (
        select s.name, count(*)::integer as total
        from public.appointments a
        join public.services s on s.id = a.service_id
        where a.starts_at >= now() - interval '90 days'
          and a.status in ('pending_confirmation', 'confirmed', 'in_progress', 'completed')
        group by s.name
        order by count(*) desc, s.name
        limit 5
      ) t
    ), '[]'::json)
  ) into v_stats;

  return v_stats;
end;
$$;

create or replace function public.admin_list_clients(
  p_search text default '',
  p_limit  integer default 50,
  p_offset integer default 0
)
returns table (
  id                 uuid,
  full_name          text,
  email              text,
  phone              text,
  created_at         timestamptz,
  total_appointments integer,
  completed_count    integer,
  no_show_count      integer,
  upcoming_count     integer,
  last_visit         timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_search text := nullif(trim(coalesce(p_search, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede ver los clientes.' using errcode = '42501';
  end if;

  return query
  select
    c.id,
    c.full_name,
    c.email,
    c.phone,
    c.created_at,
    count(a.id)::integer,
    count(a.id) filter (where a.status = 'completed')::integer,
    count(a.id) filter (where a.status = 'no_show')::integer,
    count(a.id) filter (
      where a.starts_at > now()
        and a.status in ('pending_confirmation', 'confirmed', 'in_progress')
    )::integer,
    max(a.starts_at) filter (where a.status = 'completed')
  from public.clients c
  left join public.appointments a on a.client_id = c.id
  where v_search is null
     or c.full_name ilike '%' || v_search || '%'
     or c.phone     ilike '%' || v_search || '%'
     or c.email     ilike '%' || v_search || '%'
  group by c.id
  order by max(a.starts_at) desc nulls last, c.full_name
  limit greatest(1, least(p_limit, 200))
  offset greatest(0, p_offset);
end;
$$;

-- ---------------------------------------------------------------------------
-- E · Permisos explícitos
-- ---------------------------------------------------------------------------
-- El revoke masivo de la migración 02 dejó huecos difíciles de rastrear.
-- Acá se declara, función por función, quién puede ejecutarla. Es la lista
-- completa y es la fuente de verdad: si algo no está acá, nadie lo ejecuta
-- desde la aplicación.

-- Sitio público (con o sin sesión)
grant execute on function public.is_admin()                              to anon, authenticated;
grant execute on function public.get_available_slots(uuid, date)         to anon, authenticated;
grant execute on function public.get_available_days(uuid, date, date)    to anon, authenticated;

-- Clientes autenticados
grant execute on function public.current_client_id()                     to authenticated;
grant execute on function public.book_appointment(uuid, timestamptz, text) to authenticated;
grant execute on function public.cancel_appointment(uuid, text)          to authenticated;
grant execute on function public.reschedule_appointment(uuid, timestamptz) to authenticated;

-- Panel (la verificación de rol está dentro de cada función)
grant execute on function public.admin_dashboard_stats()                 to authenticated;
grant execute on function public.admin_list_clients(text, integer, integer) to authenticated;

-- Mantenimiento: solo el cron con service_role
revoke execute on function public.expire_pending_appointments() from public, anon, authenticated;
revoke execute on function public.get_due_reminders(integer)    from public, anon, authenticated;
revoke execute on function public.mark_reminder_sent(uuid, boolean, text) from public, anon, authenticated;
revoke execute on function public.promote_to_admin(text)        from public, anon, authenticated;

grant execute on function public.expire_pending_appointments()  to service_role;
grant execute on function public.get_due_reminders(integer)     to service_role;
grant execute on function public.mark_reminder_sent(uuid, boolean, text) to service_role;
grant execute on function public.promote_to_admin(text)         to service_role;
