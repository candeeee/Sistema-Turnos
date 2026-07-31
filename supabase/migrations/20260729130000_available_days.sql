-- ===========================================================================
-- 05 · Disponibilidad por día (calendario)
-- ===========================================================================
-- El calendario necesita saber qué días tienen al menos un horario libre para
-- poder deshabilitar el resto. Consultar get_available_slots() día por día
-- desde la aplicación serían 30 o 60 llamadas por mes visible.
-- Esta función lo resuelve en una sola consulta.
-- ===========================================================================

create or replace function public.get_available_days(
  p_service_id uuid,
  p_from       date,
  p_to         date
)
returns table (day date, slot_count integer)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_settings public.business_settings%rowtype;
  v_today    date;
  v_from     date;
  v_to       date;
begin
  select * into v_settings from public.business_settings where id;

  if not exists (select 1 from public.services where id = p_service_id and is_active) then
    return;
  end if;

  v_today := (now() at time zone v_settings.timezone)::date;

  -- El rango pedido se recorta contra la ventana real de reservas: nadie
  -- puede pedir disponibilidad del año que viene ni del mes pasado.
  v_from := greatest(p_from, v_today);
  v_to   := least(p_to, v_today + v_settings.max_days_ahead);

  if v_from > v_to then
    return;
  end if;

  return query
  select d::date, count(s.slot_start)::integer
  from generate_series(v_from, v_to, interval '1 day') as d
  cross join lateral public.get_available_slots(p_service_id, d::date) as s
  group by d
  having count(s.slot_start) > 0
  order by d;
end;
$$;

revoke execute on function public.get_available_days(uuid, date, date) from public;
grant execute on function public.get_available_days(uuid, date, date) to anon, authenticated;
