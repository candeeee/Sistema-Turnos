-- ===========================================================================
-- 08 · Permiso faltante y consistencia de los bloques horarios
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1 · permission denied for function is_terminal_status
-- ---------------------------------------------------------------------------
-- Causa exacta:
--
-- La migración 02 revoca EXECUTE sobre todas las funciones del esquema y
-- después otorga permisos una por una. `is_terminal_status()` quedó fuera de
-- esa lista.
--
-- El error no apareció antes por cómo PostgreSQL verifica los permisos:
--
--   · En un TRIGGER, el permiso sobre la función se comprueba al CREAR el
--     trigger, no al dispararlo. Por eso los 9 triggers del sistema funcionan
--     sin ningún GRANT.
--   · Dentro del CUERPO de una función, se comprueba en CADA ejecución, con
--     el rol que esté corriendo en ese momento.
--
-- `appointments_guard_transition()` es SECURITY INVOKER: corre como
-- `authenticated`, y en su cuerpo llama a `is_terminal_status()`. Ese es el
-- único camino del sistema donde una función invocadora llama a otra función
-- del esquema, y por eso el único que falla.
--
-- `cancel_appointment()` también la llama, pero es SECURITY DEFINER y corre
-- como el dueño, que sí tiene permiso. De ahí que cancelar desde "Mi cuenta"
-- funcione y cambiar el estado desde el panel no.
--
-- Por qué el GRANT y no SECURITY DEFINER:
-- `is_terminal_status(appointment_status)` es IMMUTABLE, recibe un enum y
-- devuelve un booleano. No consulta ninguna tabla, no lee una sola fila y no
-- puede filtrar información. Otorgar EXECUTE no expone nada.
-- Marcar el trigger como SECURITY DEFINER sí sería un riesgo: le daría
-- privilegios de dueño a una función que procesa datos enviados por el
-- usuario. La regla del proyecto se mantiene: el mínimo privilegio necesario,
-- explícito y documentado.

grant execute on function public.is_terminal_status(public.appointment_status)
  to authenticated, service_role;

comment on function public.is_terminal_status(public.appointment_status) is
  'Función pura sin acceso a datos. La llaman appointments_guard_transition() '
  '(SECURITY INVOKER, por eso necesita GRANT) y cancel_appointment().';

-- ---------------------------------------------------------------------------
-- 2 · Consistencia de los bloques horarios
-- ---------------------------------------------------------------------------
-- La disponibilidad se calcula comparando rangos: un horario candidato queda
-- descartado si su bloque [inicio, inicio + duración + buffer) se superpone
-- con el rango [starts_at, ends_at) de algún turno activo. Un turno de 2 horas
-- a las 13:00 ocupa hasta las 15:00, y por eso descarta 13:30, 14:00 y 14:30
-- aunque el intervalo entre horarios sea de 30 minutos.
--
-- Todo eso depende de que `ends_at` sea correcto. Lo calcula el trigger
-- `appointments_compute_end`, pero si algún turno se creó mientras ese trigger
-- no existía —por ejemplo, durante una instalación con migraciones aplicadas a
-- mano— su `ends_at` quedó mal y ese turno bloquea menos tiempo del que ocupa.
--
-- Esta corrección recalcula los turnos futuros que estén desalineados.
-- Los pasados no se tocan: son historial y no afectan la disponibilidad.

update public.appointments
   set ends_at = starts_at
     + make_interval(mins => duration_min_snapshot + buffer_min_snapshot)
 where starts_at > now()
   and ends_at is distinct from
       starts_at + make_interval(mins => duration_min_snapshot + buffer_min_snapshot);

-- ---------------------------------------------------------------------------
-- 3 · Verificación de la duración real de cada turno
-- ---------------------------------------------------------------------------
-- Los turnos guardan la duración con la que fueron reservados (snapshot), así
-- que si el negocio cambia la duración de un servicio, los turnos anteriores
-- siguen bloqueando su duración original. Es el comportamiento correcto —el
-- historial no cambia retroactivamente— pero se ve como si la agenda
-- "bloqueara mal".
--
-- Esta función informa qué turnos futuros tienen una duración distinta a la
-- que hoy tiene su servicio, para poder decidir caso por caso.

create or replace function public.admin_appointments_duration_drift()
returns table (
  appointment_id   uuid,
  starts_at        timestamptz,
  client_name      text,
  service_name     text,
  duracion_turno   integer,
  duracion_servicio integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede consultar esto.' using errcode = '42501';
  end if;

  return query
  select
    a.id,
    a.starts_at,
    c.full_name,
    s.name,
    a.duration_min_snapshot,
    s.duration_min
  from public.appointments a
  join public.clients c  on c.id = a.client_id
  join public.services s on s.id = a.service_id
  where a.starts_at > now()
    and a.status in ('pending_confirmation', 'confirmed', 'in_progress')
    and a.duration_min_snapshot <> s.duration_min
  order by a.starts_at;
end;
$$;

revoke execute on function public.admin_appointments_duration_drift() from public, anon;
grant execute on function public.admin_appointments_duration_drift() to authenticated;

-- ---------------------------------------------------------------------------
-- 4 · Sonda para el diagnóstico
-- ---------------------------------------------------------------------------
-- Reproduce exactamente el camino que falló: una función SECURITY INVOKER que
-- llama a is_terminal_status() en su cuerpo. Si algún día vuelve a faltar el
-- GRANT, /admin/diagnostico lo detecta antes de que alguien intente cambiar el
-- estado de un turno real.
--
-- No consulta datos: solo ejerce el permiso.

create or replace function public.check_status_guard()
returns boolean
language plpgsql
stable
as $$
begin
  perform public.is_terminal_status('completed'::public.appointment_status);
  return true;
end;
$$;

revoke execute on function public.check_status_guard() from public, anon;
grant execute on function public.check_status_guard() to authenticated;

comment on function public.check_status_guard() is
  'Sonda de permisos: verifica que una función SECURITY INVOKER pueda ejecutar '
  'is_terminal_status(), que es lo que hace el trigger de cambio de estado.';
