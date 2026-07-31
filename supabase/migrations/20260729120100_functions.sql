-- ===========================================================================
-- 02 · Funciones, triggers y RPCs
-- ===========================================================================
-- Toda la lógica que no puede confiarse al frontend vive acá:
-- disponibilidad, reserva, cancelación, reprogramación y auditoría.
-- La aplicación Next.js nunca inserta un turno con INSERT directo.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- is_admin() es SECURITY DEFINER para poder leer public.profiles sin disparar
-- las policies de esa misma tabla. Sin esto, cualquier policy que pregunte
-- "¿es admin?" entraría en recursión infinita.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.current_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.clients where user_id = auth.uid();
$$;

create or replace function public.is_terminal_status(p_status public.appointment_status)
returns boolean
language sql
immutable
as $$
  select p_status in (
    'completed', 'cancelled_by_client', 'cancelled_by_business',
    'rescheduled', 'no_show'
  );
$$;

-- ---------------------------------------------------------------------------
-- Alta de usuarios: perfil + ficha de cliente
-- ---------------------------------------------------------------------------
-- Se ejecuta dentro de la transacción de signup. El nombre y el teléfono
-- llegan en raw_user_meta_data desde el formulario de registro.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);

  insert into public.clients (user_id, full_name, email, phone)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Sin nombre'),
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'phone'), ''), 'Sin teléfono')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nadie puede auto-ascenderse: el rol solo lo cambia otro administrador.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() nulo = no hay sesión de usuario: es el bootstrap con
  -- service_role (promote_to_admin). Esa vía ya está restringida por GRANT.
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Solo un administrador puede cambiar roles.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- El vínculo entre una ficha y una cuenta solo lo cambia un administrador.
create or replace function public.protect_client_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is distinct from old.user_id and not public.is_admin() then
    raise exception 'No podés cambiar la cuenta asociada a esta ficha.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger clients_protect_link
  before update on public.clients
  for each row execute function public.protect_client_link();

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

create trigger business_settings_set_updated_at
  before update on public.business_settings
  for each row execute function public.set_updated_at();

create trigger internal_notes_set_updated_at
  before update on public.internal_notes
  for each row execute function public.set_updated_at();

create trigger appointment_reminders_set_updated_at
  before update on public.appointment_reminders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Validaciones de configuración
-- ---------------------------------------------------------------------------

create or replace function public.validate_business_settings()
returns trigger
language plpgsql
as $$
begin
  if not exists (select 1 from pg_timezone_names where name = new.timezone) then
    raise exception 'La zona horaria "%" no existe.', new.timezone
      using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger business_settings_validate
  before insert or update on public.business_settings
  for each row execute function public.validate_business_settings();

-- Dos franjas del mismo día no pueden superponerse.
create or replace function public.validate_business_hours()
returns trigger
language plpgsql
as $$
begin
  if new.is_active and exists (
    select 1
    from public.business_hours bh
    where bh.weekday = new.weekday
      and bh.is_active
      and bh.id <> new.id
      and (new.opens_at, new.closes_at) overlaps (bh.opens_at, bh.closes_at)
  ) then
    raise exception 'Esa franja horaria se superpone con otra del mismo día.'
      using errcode = '23P01';
  end if;
  return new;
end;
$$;

create trigger business_hours_validate
  before insert or update on public.business_hours
  for each row execute function public.validate_business_hours();

-- ---------------------------------------------------------------------------
-- Turnos: cálculo de fin, transiciones y auditoría
-- ---------------------------------------------------------------------------

create or replace function public.appointments_compute_end()
returns trigger
language plpgsql
as $$
begin
  new.ends_at := new.starts_at
    + make_interval(mins => new.duration_min_snapshot + new.buffer_min_snapshot);
  return new;
end;
$$;

create trigger appointments_compute_end
  before insert or update of starts_at, duration_min_snapshot, buffer_min_snapshot
  on public.appointments
  for each row execute function public.appointments_compute_end();

create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- Un turno en estado terminal no vuelve atrás. Si hubo un error, se crea uno
-- nuevo: así el historial del cliente nunca miente.
create or replace function public.appointments_guard_transition()
returns trigger
language plpgsql
as $$
begin
  if old.status is distinct from new.status and public.is_terminal_status(old.status) then
    raise exception 'El turno ya está en estado "%" y no puede volver atrás. Creá un turno nuevo.', old.status
      using errcode = '23514';
  end if;

  -- Al confirmar, el turno deja de tener vencimiento por falta de seña.
  if new.status = 'confirmed' and old.status = 'pending_confirmation' then
    new.hold_expires_at := null;
  end if;

  return new;
end;
$$;

create trigger appointments_guard_transition
  before update on public.appointments
  for each row execute function public.appointments_guard_transition();

create or replace function public.appointments_log_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.appointment_status_history (appointment_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, auth.uid());
  elsif old.status is distinct from new.status then
    insert into public.appointment_status_history (appointment_id, from_status, to_status, changed_by, reason)
    values (new.id, old.status, new.status, auth.uid(), new.cancellation_reason);
  end if;
  return new;
end;
$$;

create trigger appointments_log_status
  after insert or update of status on public.appointments
  for each row execute function public.appointments_log_status();

-- ---------------------------------------------------------------------------
-- Recordatorios: se encolan y se cancelan solos
-- ---------------------------------------------------------------------------
-- La aplicación nunca escribe en esta tabla. Este trigger mantiene la cola
-- sincronizada con el estado real de los turnos; el proceso que envía se
-- conecta después leyendo `get_due_reminders()`.

create or replace function public.appointments_sync_reminder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hours integer;
  v_when  timestamptz;
begin
  select reminder_hours_before into v_hours from public.business_settings where id;
  v_when := new.starts_at - make_interval(hours => v_hours);

  if new.status in ('pending_confirmation', 'confirmed') then
    insert into public.appointment_reminders (appointment_id, scheduled_for, status)
    values (new.id, v_when, case when v_when > now() then 'pending' else 'cancelled' end)
    on conflict (appointment_id, kind) do update
      set scheduled_for = excluded.scheduled_for,
          status = case
                     when public.appointment_reminders.status = 'sent' then 'sent'
                     when excluded.scheduled_for > now() then 'pending'
                     else 'cancelled'
                   end;
  else
    update public.appointment_reminders
      set status = 'cancelled'
      where appointment_id = new.id and status = 'pending';
  end if;

  return new;
end;
$$;

create trigger appointments_sync_reminder
  after insert or update of status, starts_at on public.appointments
  for each row execute function public.appointments_sync_reminder();

-- ---------------------------------------------------------------------------
-- Motor de disponibilidad
-- ---------------------------------------------------------------------------
-- No existe una tabla de "horarios disponibles": pre-generarlos obligaría a
-- regenerar millones de filas cada vez que el negocio cambia un horario.
-- Los slots se calculan al vuelo cruzando franjas de atención, excepciones y
-- turnos activos. Esta función es la única fuente de verdad de disponibilidad
-- y la usan por igual el sitio público, el panel y book_appointment().

create or replace function public.get_available_slots(p_service_id uuid, p_date date)
returns table (slot_start timestamptz, slot_end timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_settings  public.business_settings%rowtype;
  v_service   public.services%rowtype;
  v_block_min integer;
  v_earliest  timestamptz;
  v_today     date;
begin
  select * into v_settings from public.business_settings where id;
  select * into v_service from public.services where id = p_service_id and is_active;
  if not found then
    return;
  end if;

  v_today := (now() at time zone v_settings.timezone)::date;

  if p_date < v_today or p_date > v_today + v_settings.max_days_ahead then
    return;
  end if;

  v_block_min := v_service.duration_min + v_service.buffer_min;
  v_earliest  := now() + make_interval(hours => v_settings.min_hours_before_booking);

  return query
  with franjas as (
    select
      ((p_date + bh.opens_at)  at time zone v_settings.timezone) as abre,
      ((p_date + bh.closes_at) at time zone v_settings.timezone) as cierra
    from public.business_hours bh
    where bh.is_active
      and bh.weekday = extract(dow from p_date)::smallint
  ),
  candidatos as (
    select
      gs as inicio,
      gs + make_interval(mins => v_block_min) as fin
    from franjas f
    cross join lateral generate_series(
      f.abre,
      f.cierra - make_interval(mins => v_block_min),
      make_interval(mins => v_settings.slot_interval_min)
    ) as gs
  )
  select c.inicio, c.fin
  from candidatos c
  where c.inicio >= v_earliest
    and not exists (
      select 1 from public.appointments a
      where a.status in ('pending_confirmation', 'confirmed', 'in_progress')
        and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(c.inicio, c.fin, '[)')
    )
    and not exists (
      select 1 from public.schedule_exceptions se
      where tstzrange(se.starts_at, se.ends_at, '[)') && tstzrange(c.inicio, c.fin, '[)')
    )
  order by c.inicio;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reservar
-- ---------------------------------------------------------------------------
-- Revalida absolutamente todo del lado del servidor. Aunque alguien llame a
-- este RPC directamente con datos manipulados, no puede reservar un horario
-- inexistente, fuera de agenda, ocupado o con un precio distinto al real.

create or replace function public.book_appointment(
  p_service_id   uuid,
  p_starts_at    timestamptz,
  p_client_notes text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_client   public.clients%rowtype;
  v_service  public.services%rowtype;
  v_settings public.business_settings%rowtype;
  v_deposit  numeric(10, 2);
  v_pending  integer;
  v_recent   integer;
  v_id       uuid;
begin
  if v_uid is null then
    raise exception 'Necesitás iniciar sesión para reservar un turno.'
      using errcode = '42501';
  end if;

  select * into v_settings from public.business_settings where id;

  select * into v_client from public.clients where user_id = v_uid;
  if not found then
    raise exception 'No encontramos tu ficha de cliente. Cerrá sesión y volvé a entrar.'
      using errcode = 'P0002';
  end if;

  -- Límite de reservas por hora: evita que un script llene la agenda.
  select count(*) into v_recent
  from public.booking_attempts
  where user_id = v_uid and created_at > now() - interval '1 hour';

  if v_recent >= v_settings.max_bookings_per_hour then
    raise exception 'Hiciste demasiadas reservas seguidas. Probá de nuevo en un rato.'
      using errcode = '54000';
  end if;

  insert into public.booking_attempts (user_id) values (v_uid);

  select count(*) into v_pending
  from public.appointments
  where client_id = v_client.id
    and status = 'pending_confirmation'
    and starts_at > now();

  if v_pending >= v_settings.max_pending_per_client then
    raise exception 'Tenés % turnos esperando la seña. Confirmalos antes de reservar otro.', v_pending
      using errcode = '54000';
  end if;

  select * into v_service from public.services where id = p_service_id and is_active;
  if not found then
    raise exception 'Ese servicio no está disponible.'
      using errcode = 'P0002';
  end if;

  -- El horario tiene que ser uno de los que el propio sistema ofrece.
  if not exists (
    select 1
    from public.get_available_slots(
      p_service_id,
      (p_starts_at at time zone v_settings.timezone)::date
    ) s
    where s.slot_start = p_starts_at
  ) then
    raise exception 'Ese horario ya no está disponible. Elegí otro.'
      using errcode = '23P01';
  end if;

  v_deposit := round(v_service.price * v_settings.deposit_percentage / 100, 2);

  insert into public.appointments (
    client_id, service_id, starts_at, ends_at, status,
    price_snapshot, duration_min_snapshot, buffer_min_snapshot,
    deposit_percentage_snapshot, deposit_amount_snapshot,
    client_notes, hold_expires_at, created_by
  ) values (
    v_client.id, v_service.id, p_starts_at, p_starts_at, 'pending_confirmation',
    v_service.price, v_service.duration_min, v_service.buffer_min,
    v_settings.deposit_percentage, v_deposit,
    coalesce(left(trim(p_client_notes), 500), ''),
    now() + make_interval(hours => v_settings.hold_hours),
    v_uid
  )
  returning id into v_id;

  return v_id;

exception
  -- El constraint EXCLUDE gana la carrera entre dos reservas simultáneas.
  -- La perdedora llega hasta acá y recibe un mensaje entendible.
  when exclusion_violation then
    raise exception 'Alguien reservó ese horario mientras completabas tus datos. Elegí otro.'
      using errcode = '23P01';
end;
$$;

-- ---------------------------------------------------------------------------
-- Cancelar (cliente)
-- ---------------------------------------------------------------------------

create or replace function public.cancel_appointment(
  p_appointment_id uuid,
  p_reason         text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid := public.current_client_id();
  v_appt      public.appointments%rowtype;
  v_settings  public.business_settings%rowtype;
begin
  if v_client_id is null then
    raise exception 'Necesitás iniciar sesión.' using errcode = '42501';
  end if;

  select * into v_appt from public.appointments
  where id = p_appointment_id and client_id = v_client_id
  for update;

  if not found then
    raise exception 'No encontramos ese turno.' using errcode = 'P0002';
  end if;

  if public.is_terminal_status(v_appt.status) or v_appt.status = 'in_progress' then
    raise exception 'Ese turno ya no se puede cancelar.' using errcode = '23514';
  end if;

  select * into v_settings from public.business_settings where id;

  if v_appt.starts_at - now() < make_interval(hours => v_settings.min_hours_before_cancel) then
    raise exception 'Los turnos se cancelan con al menos % horas de anticipación. Escribinos por WhatsApp.',
      v_settings.min_hours_before_cancel using errcode = '23514';
  end if;

  update public.appointments
    set status = 'cancelled_by_client',
        cancellation_reason = nullif(left(trim(p_reason), 500), '')
  where id = p_appointment_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reprogramar (cliente)
-- ---------------------------------------------------------------------------
-- El turno original pasa a 'rescheduled' (estado terminal, libera el horario)
-- y nace uno nuevo encadenado. Las condiciones comerciales se conservan: el
-- cliente no paga un precio distinto por mover su turno.

create or replace function public.reschedule_appointment(
  p_appointment_id uuid,
  p_new_starts_at  timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid := public.current_client_id();
  v_appt      public.appointments%rowtype;
  v_settings  public.business_settings%rowtype;
  v_new_id    uuid;
begin
  if v_client_id is null then
    raise exception 'Necesitás iniciar sesión.' using errcode = '42501';
  end if;

  select * into v_appt from public.appointments
  where id = p_appointment_id and client_id = v_client_id
  for update;

  if not found then
    raise exception 'No encontramos ese turno.' using errcode = 'P0002';
  end if;

  if v_appt.status not in ('pending_confirmation', 'confirmed') then
    raise exception 'Ese turno ya no se puede reprogramar.' using errcode = '23514';
  end if;

  select * into v_settings from public.business_settings where id;

  if v_appt.starts_at - now() < make_interval(hours => v_settings.min_hours_before_cancel) then
    raise exception 'Los turnos se reprograman con al menos % horas de anticipación. Escribinos por WhatsApp.',
      v_settings.min_hours_before_cancel using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.get_available_slots(
      v_appt.service_id,
      (p_new_starts_at at time zone v_settings.timezone)::date
    ) s
    where s.slot_start = p_new_starts_at
  ) then
    raise exception 'Ese horario ya no está disponible. Elegí otro.' using errcode = '23P01';
  end if;

  update public.appointments set status = 'rescheduled' where id = p_appointment_id;

  insert into public.appointments (
    client_id, service_id, starts_at, ends_at, status,
    price_snapshot, duration_min_snapshot, buffer_min_snapshot,
    deposit_percentage_snapshot, deposit_amount_snapshot,
    client_notes, hold_expires_at, rescheduled_from_id, created_by
  ) values (
    v_appt.client_id, v_appt.service_id, p_new_starts_at, p_new_starts_at, v_appt.status,
    v_appt.price_snapshot, v_appt.duration_min_snapshot, v_appt.buffer_min_snapshot,
    v_appt.deposit_percentage_snapshot, v_appt.deposit_amount_snapshot,
    v_appt.client_notes, v_appt.hold_expires_at, v_appt.id, auth.uid()
  )
  returning id into v_new_id;

  return v_new_id;

exception
  when exclusion_violation then
    raise exception 'Alguien tomó ese horario recién. Elegí otro.' using errcode = '23P01';
end;
$$;

-- ---------------------------------------------------------------------------
-- Mantenimiento (los ejecuta un cron job, nunca el navegador)
-- ---------------------------------------------------------------------------

-- Libera los horarios de las reservas que nunca recibieron la seña.
create or replace function public.expire_pending_appointments()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with vencidos as (
    update public.appointments
      set status = 'cancelled_by_business',
          cancellation_reason = 'Vencido: no se registró la seña dentro del plazo.'
    where status = 'pending_confirmation'
      and hold_expires_at is not null
      and hold_expires_at < now()
    returning 1
  )
  select count(*) into v_count from vencidos;

  -- La tabla de intentos solo sirve para la ventana de una hora.
  delete from public.booking_attempts where created_at < now() - interval '1 day';

  return v_count;
end;
$$;

-- Devuelve los recordatorios listos para enviar, con todo lo que necesita el
-- canal (WhatsApp, email o el que se conecte mañana) para armar el mensaje.
create or replace function public.get_due_reminders(p_limit integer default 100)
returns table (
  reminder_id    uuid,
  appointment_id uuid,
  client_name    text,
  client_phone   text,
  client_email   text,
  service_name   text,
  starts_at      timestamptz,
  business_name  text,
  business_tz    text
)
language sql
security definer
set search_path = public
as $$
  select
    r.id, a.id, c.full_name, c.phone, c.email,
    s.name, a.starts_at, bs.name, bs.timezone
  from public.appointment_reminders r
  join public.appointments a on a.id = r.appointment_id
  join public.clients c      on c.id = a.client_id
  join public.services s     on s.id = a.service_id
  cross join public.business_settings bs
  where r.status = 'pending'
    and r.scheduled_for <= now()
    and a.status in ('pending_confirmation', 'confirmed')
    and a.starts_at > now()
  order by r.scheduled_for
  limit greatest(1, least(p_limit, 500));
$$;

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
    set status     = case when p_success then 'sent' else 'failed' end,
        sent_at    = case when p_success then now() else sent_at end,
        attempts   = attempts + 1,
        last_error = p_error
  where id = p_reminder_id;
$$;

-- ---------------------------------------------------------------------------
-- Permisos de ejecución
-- ---------------------------------------------------------------------------
-- Por defecto PostgreSQL le da EXECUTE a public sobre toda función nueva.
-- Se revoca y se otorga explícitamente lo mínimo necesario.

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.get_available_slots(uuid, date) to anon, authenticated;
grant execute on function public.book_appointment(uuid, timestamptz, text) to authenticated;
grant execute on function public.cancel_appointment(uuid, text) to authenticated;
grant execute on function public.reschedule_appointment(uuid, timestamptz) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_client_id() to authenticated;

-- Mantenimiento: solo service_role (los endpoints /api/cron y el cron de Supabase).
grant execute on function public.expire_pending_appointments() to service_role;
grant execute on function public.get_due_reminders(integer) to service_role;
grant execute on function public.mark_reminder_sent(uuid, boolean, text) to service_role;
