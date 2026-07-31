-- ===========================================================================
-- 09 · Segundo recordatorio
-- ===========================================================================
-- Va en su propia migración porque `alter type ... add value` no puede
-- ejecutarse dentro de una transacción junto con otras operaciones que usen el
-- valor nuevo. Es la misma regla documentada en el README para agregar
-- estados de turno.
-- ===========================================================================

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'reminder_kind' and e.enumlabel = 'appointment_second'
  ) then
    alter type public.reminder_kind add value 'appointment_second';
  end if;
end
$$;
