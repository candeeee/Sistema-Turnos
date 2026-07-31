-- ===========================================================================
-- 06 · Consultas agregadas del panel
-- ===========================================================================
-- El dashboard y el listado de clientes necesitan conteos que en la
-- aplicación serían cinco o seis consultas separadas más agregación en
-- memoria. Se resuelven en la base, en una sola llamada cada uno.
--
-- Las dos funciones son SECURITY DEFINER, así que verifican is_admin()
-- explícitamente: al ejecutarse como dueño no pasan por RLS.
-- ===========================================================================

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

  select timezone into v_tz from public.business_settings where id;
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

-- ---------------------------------------------------------------------------
-- Listado de clientes con sus métricas
-- ---------------------------------------------------------------------------

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

revoke execute on function public.admin_dashboard_stats() from public, anon;
revoke execute on function public.admin_list_clients(text, integer, integer) from public, anon;
grant execute on function public.admin_dashboard_stats() to authenticated;
grant execute on function public.admin_list_clients(text, integer, integer) to authenticated;
