-- ===========================================================================
-- 01 · Esquema base: extensiones, tipos, tablas, índices y constraints
-- ===========================================================================
-- Todas las tablas viven en el esquema `public` y quedan con RLS habilitado.
-- Las policies se definen en la migración 03. Entre esta migración y esa,
-- ninguna tabla es accesible desde el cliente: RLS activo sin policies = deny.
-- ===========================================================================

-- btree_gist permite combinar operadores de igualdad (=) con operadores de
-- rango (&&) dentro de un mismo constraint EXCLUDE. Es lo que hace posible
-- impedir a nivel de base de datos que dos turnos se superpongan.
create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('client', 'admin');

create type public.appointment_status as enum (
  'pending_confirmation',   -- reservado, esperando la seña
  'confirmed',              -- seña recibida
  'in_progress',            -- el cliente está siendo atendido
  'completed',              -- turno finalizado
  'cancelled_by_client',
  'cancelled_by_business',
  'rescheduled',            -- terminal: liberó su horario, existe un turno nuevo
  'no_show'
);

create type public.schedule_exception_type as enum ('holiday', 'vacation', 'block');

create type public.reminder_kind as enum ('appointment_24h');

create type public.reminder_status as enum ('pending', 'sent', 'failed', 'cancelled');

-- ---------------------------------------------------------------------------
-- profiles · extensión de auth.users con el rol
-- ---------------------------------------------------------------------------
-- El rol NUNCA se guarda en el JWT ni en user_metadata: user_metadata es
-- escribible por el propio usuario y permitiría auto-asignarse admin.

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.user_role not null default 'client',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role) where role = 'admin';

comment on table public.profiles is
  'Rol de cada usuario autenticado. Fuente de verdad para is_admin().';

-- ---------------------------------------------------------------------------
-- clients · ficha del cliente
-- ---------------------------------------------------------------------------
-- Está desacoplada de auth.users a propósito: user_id es nullable para que el
-- administrador pueda cargar a mano un cliente que llegó por teléfono o que
-- vino sin turno, sin obligarlo a crear una cuenta. Las reservas online sí
-- exigen cuenta (ver book_appointment).

create table public.clients (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid unique references auth.users (id) on delete set null,
  full_name      text not null,
  email          text,
  phone          text not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint clients_full_name_length check (char_length(trim(full_name)) between 2 and 120),
  constraint clients_phone_length     check (char_length(trim(phone)) between 6 and 30),
  constraint clients_email_format     check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create unique index clients_email_unique_idx
  on public.clients (lower(email)) where email is not null;

create index clients_full_name_search_idx
  on public.clients using gin (to_tsvector('spanish', full_name));

create index clients_phone_idx on public.clients (phone);

-- Las observaciones privadas NO viven acá: si estuvieran en esta tabla, la
-- policy que deja al cliente ver su propia ficha se las mostraría. Van en
-- public.internal_notes, con acceso exclusivo del administrador.

-- ---------------------------------------------------------------------------
-- services · servicios que se pueden reservar
-- ---------------------------------------------------------------------------

create table public.services (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  description   text not null default '',
  duration_min  integer not null,
  buffer_min    integer not null default 0,
  price         numeric(10, 2) not null,
  image_path    text,
  is_active     boolean not null default true,
  is_featured   boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint services_name_length   check (char_length(trim(name)) between 2 and 120),
  constraint services_slug_format   check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint services_duration_range check (duration_min between 5 and 600),
  constraint services_buffer_range  check (buffer_min between 0 and 240),
  constraint services_price_positive check (price >= 0)
);

create index services_active_order_idx
  on public.services (sort_order, name) where is_active;

comment on column public.services.buffer_min is
  'Minutos de limpieza/preparación que quedan bloqueados después del turno.';
comment on column public.services.image_path is
  'Ruta dentro del bucket "services" de Storage. No es una URL completa.';

-- ---------------------------------------------------------------------------
-- business_settings · fila única con la configuración del negocio
-- ---------------------------------------------------------------------------
-- El truco de `id boolean primary key default true check (id)` garantiza a
-- nivel de base de datos que solo pueda existir una fila.

create table public.business_settings (
  id                         boolean primary key default true,

  -- Datos públicos
  name                       text not null default '',
  phone                      text not null default '',
  whatsapp                   text not null default '',
  email                      text not null default '',
  address                    text not null default '',
  maps_url                   text,
  instagram                  text not null default '',
  facebook                   text not null default '',

  -- Operación
  timezone                   text not null default 'America/Argentina/Buenos_Aires',
  slot_interval_min          integer not null default 15,
  min_hours_before_booking   integer not null default 2,
  max_days_ahead             integer not null default 60,
  min_hours_before_cancel    integer not null default 24,
  hold_hours                 integer not null default 24,
  reminder_hours_before      integer not null default 24,
  max_pending_per_client     integer not null default 3,
  max_bookings_per_hour      integer not null default 10,

  -- Seña (solo informativa: no se procesan pagos)
  deposit_percentage         numeric(5, 2) not null default 30,
  deposit_alias              text not null default '',
  deposit_cbu                text not null default '',
  deposit_instructions       text not null default '',

  -- Texto que se muestra antes de confirmar la reserva
  booking_notice             text not null default '',

  updated_at                 timestamptz not null default now(),

  constraint business_settings_singleton  check (id),
  constraint business_settings_deposit_pct check (deposit_percentage between 0 and 100),
  constraint business_settings_slot_range  check (slot_interval_min between 5 and 120),
  constraint business_settings_notice      check (min_hours_before_booking between 0 and 720),
  constraint business_settings_ahead       check (max_days_ahead between 1 and 365),
  constraint business_settings_cancel      check (min_hours_before_cancel between 0 and 720),
  constraint business_settings_hold        check (hold_hours between 1 and 720),
  constraint business_settings_reminder    check (reminder_hours_before between 1 and 168),
  constraint business_settings_max_pending check (max_pending_per_client between 1 and 50),
  constraint business_settings_max_rate    check (max_bookings_per_hour between 1 and 100)
  -- La validez de `timezone` se verifica contra pg_timezone_names en un
  -- trigger (migración 02): un CHECK no puede consultar catálogos.
);

-- Fila única inicial con valores vacíos. No son datos ficticios: son los
-- valores por defecto que el administrador completa desde el panel. Sin esta
-- fila el sitio no tendría configuración que leer.
insert into public.business_settings (id) values (true);

-- ---------------------------------------------------------------------------
-- business_hours · franjas de atención por día de semana
-- ---------------------------------------------------------------------------
-- Varias filas por día permiten cortar al mediodía (09:00-13:00 y 16:00-20:00),
-- algo imposible con un único par apertura/cierre.
-- weekday sigue la convención de PostgreSQL: 0 = domingo … 6 = sábado.

create table public.business_hours (
  id         uuid primary key default gen_random_uuid(),
  weekday    smallint not null,
  opens_at   time not null,
  closes_at  time not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),

  constraint business_hours_weekday_range check (weekday between 0 and 6),
  constraint business_hours_order         check (closes_at > opens_at)
);

create index business_hours_weekday_idx
  on public.business_hours (weekday, opens_at) where is_active;

-- ---------------------------------------------------------------------------
-- schedule_exceptions · feriados, vacaciones y bloqueos puntuales
-- ---------------------------------------------------------------------------
-- Una sola tabla con un tipo, en lugar de tres tablas idénticas. Todas las
-- excepciones se comportan igual: bloquean un rango de tiempo.

create table public.schedule_exceptions (
  id         uuid primary key default gen_random_uuid(),
  type       public.schedule_exception_type not null,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  reason     text not null default '',
  created_at timestamptz not null default now(),

  constraint schedule_exceptions_order check (ends_at > starts_at)
);

create index schedule_exceptions_range_idx
  on public.schedule_exceptions using gist (tstzrange(starts_at, ends_at, '[)'));

-- ---------------------------------------------------------------------------
-- appointments · turnos
-- ---------------------------------------------------------------------------
-- Los campos *_snapshot congelan las condiciones comerciales al momento de
-- reservar. Si mañana sube el precio o cambia la duración del servicio, los
-- turnos ya reservados conservan lo que se le informó al cliente.

create table public.appointments (
  id                          uuid primary key default gen_random_uuid(),
  client_id                   uuid not null references public.clients (id) on delete restrict,
  service_id                  uuid not null references public.services (id) on delete restrict,

  starts_at                   timestamptz not null,
  ends_at                     timestamptz not null,

  status                      public.appointment_status not null default 'pending_confirmation',

  price_snapshot              numeric(10, 2) not null,
  duration_min_snapshot       integer not null,
  buffer_min_snapshot         integer not null default 0,
  deposit_percentage_snapshot numeric(5, 2) not null,
  deposit_amount_snapshot     numeric(10, 2) not null,

  client_notes                text not null default '',
  cancellation_reason         text,

  -- Vencimiento de la reserva sin seña. Un job lo usa para liberar el horario.
  hold_expires_at             timestamptz,

  -- Encadenado de reprogramaciones: el turno nuevo apunta al anterior.
  rescheduled_from_id         uuid unique references public.appointments (id) on delete set null,

  created_by                  uuid references auth.users (id) on delete set null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),

  constraint appointments_order            check (ends_at > starts_at),
  constraint appointments_price_positive   check (price_snapshot >= 0),
  constraint appointments_deposit_positive check (deposit_amount_snapshot >= 0),
  constraint appointments_duration_range   check (duration_min_snapshot between 5 and 600),
  constraint appointments_not_self         check (rescheduled_from_id is distinct from id)
);

-- El corazón del sistema: imposible que dos turnos activos se pisen.
-- Resuelve la condición de carrera de dos personas reservando el mismo horario
-- al mismo tiempo, algo que ninguna validación de frontend puede evitar.
-- Los estados terminales (cancelado, reprogramado, no asistió) quedan fuera:
-- liberan el horario automáticamente.
alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status in ('pending_confirmation', 'confirmed', 'in_progress'));

create index appointments_starts_at_idx on public.appointments (starts_at desc);
create index appointments_client_idx    on public.appointments (client_id, starts_at desc);
create index appointments_service_idx   on public.appointments (service_id);
create index appointments_status_idx    on public.appointments (status, starts_at);
create index appointments_hold_idx
  on public.appointments (hold_expires_at)
  where status = 'pending_confirmation';

comment on column public.appointments.ends_at is
  'Calculado por trigger: starts_at + duración + buffer. No se envía desde el cliente.';

-- ---------------------------------------------------------------------------
-- internal_notes · observaciones privadas del negocio
-- ---------------------------------------------------------------------------
-- Tabla separada por una razón de seguridad concreta: RLS filtra filas, no
-- columnas. Si estas notas fueran una columna de `clients` o `appointments`,
-- el cliente las leería junto con sus propios datos. Acá el acceso es
-- exclusivamente del administrador.

create table public.internal_notes (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients (id) on delete cascade,
  appointment_id uuid references public.appointments (id) on delete set null,
  body           text not null,
  author_id      uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint internal_notes_body_length check (char_length(trim(body)) between 1 and 2000)
);

create index internal_notes_client_idx on public.internal_notes (client_id, created_at desc);
create index internal_notes_appointment_idx on public.internal_notes (appointment_id);

-- ---------------------------------------------------------------------------
-- appointment_status_history · auditoría de cambios de estado
-- ---------------------------------------------------------------------------

create table public.appointment_status_history (
  id             bigint generated always as identity primary key,
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  from_status    public.appointment_status,
  to_status      public.appointment_status not null,
  changed_by     uuid references auth.users (id) on delete set null,
  reason         text,
  created_at     timestamptz not null default now()
);

create index appointment_status_history_appointment_idx
  on public.appointment_status_history (appointment_id, created_at desc);

-- ---------------------------------------------------------------------------
-- appointment_reminders · cola de recordatorios
-- ---------------------------------------------------------------------------
-- Desacoplada de la lógica de reserva: la aplicación solo encola. Quien
-- consume la cola (cron job, Edge Function, worker externo) se conecta
-- después sin tocar una línea del resto del sistema.
-- El unique (appointment_id, kind) hace imposible el envío duplicado aunque
-- el job corra dos veces en paralelo.

create table public.appointment_reminders (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  kind           public.reminder_kind not null default 'appointment_24h',
  scheduled_for  timestamptz not null,
  status         public.reminder_status not null default 'pending',
  attempts       integer not null default 0,
  sent_at        timestamptz,
  last_error     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint appointment_reminders_unique unique (appointment_id, kind),
  constraint appointment_reminders_attempts check (attempts >= 0)
);

create index appointment_reminders_due_idx
  on public.appointment_reminders (scheduled_for)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- booking_rate_limit · protección del endpoint público de reserva
-- ---------------------------------------------------------------------------

create table public.booking_attempts (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index booking_attempts_user_idx on public.booking_attempts (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS habilitado en todo. Sin policies (migración 03) nadie ve nada.
-- ---------------------------------------------------------------------------

alter table public.profiles                   enable row level security;
alter table public.clients                    enable row level security;
alter table public.services                   enable row level security;
alter table public.business_settings          enable row level security;
alter table public.business_hours             enable row level security;
alter table public.schedule_exceptions        enable row level security;
alter table public.appointments               enable row level security;
alter table public.internal_notes             enable row level security;
alter table public.appointment_status_history enable row level security;
alter table public.appointment_reminders      enable row level security;
alter table public.booking_attempts           enable row level security;
