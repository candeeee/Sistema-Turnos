-- ===========================================================================
-- 10 · Mensajes y segundo recordatorio
-- ===========================================================================
-- El sistema ya encolaba un recordatorio por turno. Acá se agrega:
--
--   · un segundo recordatorio configurable (por ejemplo, 2 horas antes),
--   · las plantillas de los mensajes que el negocio manda por WhatsApp,
--   · el tipo de recordatorio en la cola, para que quien envíe sepa cuál es.
--
-- Los mensajes se guardan como plantillas con variables entre llaves. El
-- renderizado ocurre en la aplicación (`src/utils/templates.ts`), no en SQL:
-- así el mismo texto sirve para WhatsApp hoy y para email mañana sin tocar
-- la base.
-- ===========================================================================

alter table public.business_settings
  add column if not exists second_reminder_enabled boolean not null default false,
  add column if not exists second_reminder_hours   integer not null default 2,
  add column if not exists message_reminder        text not null default '',
  add column if not exists message_confirmation    text not null default '',
  add column if not exists message_cancellation    text not null default '',
  add column if not exists message_status_change   text not null default '';

alter table public.business_settings
  drop constraint if exists business_settings_second_reminder;

alter table public.business_settings
  add constraint business_settings_second_reminder
  check (second_reminder_hours between 1 and 72);

-- Textos iniciales. No son datos de ejemplo: son los valores por defecto del
-- producto, editables desde /admin/notificaciones. Solo se cargan si el campo
-- está vacío, así una actualización nunca pisa lo que escribió el negocio.
update public.business_settings set
  message_confirmation = case when message_confirmation = '' then
    '¡Hola {cliente}! Confirmamos tu turno de {servicio} para el {fecha} a las {hora}. Te esperamos en {negocio}.'
    else message_confirmation end,
  message_reminder = case when message_reminder = '' then
    '¡Hola {cliente}! Te recordamos tu turno de {servicio} el {fecha} a las {hora}. Si no podés venir, avisanos así liberamos el lugar.'
    else message_reminder end,
  message_cancellation = case when message_cancellation = '' then
    'Hola {cliente}, cancelamos tu turno de {servicio} del {fecha} a las {hora}. Escribinos cuando quieras y coordinamos uno nuevo.'
    else message_cancellation end,
  message_status_change = case when message_status_change = '' then
    'Hola {cliente}, tu turno de {servicio} del {fecha} a las {hora} pasó a: {estado}.'
    else message_status_change end
where id = true;

-- ---------------------------------------------------------------------------
-- Cola de recordatorios: ahora dos por turno
-- ---------------------------------------------------------------------------
-- La lógica de idempotencia no cambia: el unique (appointment_id, kind) hace
-- imposible el envío duplicado de cada tipo, aunque el job corra dos veces.

create or replace function public.appointments_sync_reminder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.business_settings%rowtype;
  v_kind     public.reminder_kind;
  v_hours    integer;
  v_when     timestamptz;
  v_status   public.reminder_status;
begin
  select * into v_settings from public.business_settings where id = true;

  -- Un recordatorio por cada tipo activo. El segundo solo si está habilitado.
  foreach v_kind in array array['appointment_24h', 'appointment_second']::public.reminder_kind[]
  loop
    if v_kind = 'appointment_second' and not v_settings.second_reminder_enabled then
      -- Si se desactivó, los pendientes de ese tipo se cancelan.
      update public.appointment_reminders
         set status = 'cancelled'
       where appointment_id = new.id and kind = v_kind and status = 'pending';
      continue;
    end if;

    v_hours := case
                 when v_kind = 'appointment_second' then v_settings.second_reminder_hours
                 else v_settings.reminder_hours_before
               end;

    v_when := new.starts_at - make_interval(hours => v_hours);

    if v_when > now() and v_settings.reminders_enabled then
      v_status := 'pending';
    else
      v_status := 'cancelled';
    end if;

    if new.status in ('pending_confirmation', 'confirmed') then
      insert into public.appointment_reminders (appointment_id, kind, scheduled_for, status)
      values (new.id, v_kind, v_when, v_status)
      on conflict (appointment_id, kind) do update
        set scheduled_for = excluded.scheduled_for,
            status = case
                       when appointment_reminders.status = 'sent' then appointment_reminders.status
                       else excluded.status
                     end;
    else
      update public.appointment_reminders
         set status = 'cancelled'
       where appointment_id = new.id and kind = v_kind and status = 'pending';
    end if;
  end loop;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Los vencidos, con todo lo necesario para armar el mensaje
-- ---------------------------------------------------------------------------
-- Cambia el tipo de retorno (se agrega `kind`), así que hay que recrearla.

drop function if exists public.get_due_reminders(integer);

create or replace function public.get_due_reminders(p_limit integer default 100)
returns table (
  reminder_id    uuid,
  appointment_id uuid,
  kind           public.reminder_kind,
  client_name    text,
  client_phone   text,
  client_email   text,
  service_name   text,
  starts_at      timestamptz,
  business_name  text,
  business_tz    text,
  template       text
)
language sql
security definer
set search_path = public
as $$
  select
    r.id, a.id, r.kind, c.full_name, c.phone, c.email,
    s.name, a.starts_at, bs.name, bs.timezone, bs.message_reminder
  from public.appointment_reminders r
  join public.appointments a on a.id = r.appointment_id
  join public.clients c      on c.id = a.client_id
  join public.services s     on s.id = a.service_id
  cross join public.business_settings bs
  where r.status = 'pending'
    and r.scheduled_for <= now()
    and a.status in ('pending_confirmation', 'confirmed')
    and a.starts_at > now()
    and bs.reminders_enabled
  order by r.scheduled_for
  limit greatest(1, least(p_limit, 500));
$$;

revoke execute on function public.get_due_reminders(integer) from public, anon, authenticated;
grant execute on function public.get_due_reminders(integer) to service_role;
