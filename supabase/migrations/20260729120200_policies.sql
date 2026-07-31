-- ===========================================================================
-- 03 · Row Level Security
-- ===========================================================================
-- Criterio general:
--   · anon         → solo lo que el sitio público necesita mostrar.
--   · authenticated → sus propios datos, nada más.
--   · admin        → todo, verificado con is_admin() contra public.profiles.
-- Los turnos NO se insertan ni se modifican directamente desde el cliente:
-- se usan los RPC book_appointment / cancel_appointment / reschedule_appointment.
-- Si mañana alguien agrega una policy de insert acá, el sistema pierde las
-- validaciones de negocio. No agregarla.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------

create policy "clients_select_own_or_admin"
  on public.clients for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "clients_update_own"
  on public.clients for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "clients_all_admin"
  on public.clients for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- El cliente no puede reasignar su ficha a otro usuario: lo impide el trigger
-- clients_protect_link (migración 02), no un revoke de columna, porque el
-- administrador sí necesita poder vincular una ficha cargada a mano.

-- ---------------------------------------------------------------------------
-- services · catálogo público
-- ---------------------------------------------------------------------------

create policy "services_select_active"
  on public.services for select
  to anon, authenticated
  using (is_active or public.is_admin());

create policy "services_all_admin"
  on public.services for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- business_settings · datos del negocio y de la seña
-- ---------------------------------------------------------------------------
-- Es información pública por definición: el visitante necesita ver dirección,
-- redes, alias y porcentaje de seña antes de reservar.

create policy "business_settings_select_all"
  on public.business_settings for select
  to anon, authenticated
  using (true);

create policy "business_settings_update_admin"
  on public.business_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- business_hours y schedule_exceptions
-- ---------------------------------------------------------------------------
-- Lectura pública: el calendario del sitio necesita saber qué días se atiende
-- y qué fechas están bloqueadas para no ofrecer horarios imposibles.

create policy "business_hours_select_all"
  on public.business_hours for select
  to anon, authenticated
  using (true);

create policy "business_hours_all_admin"
  on public.business_hours for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "schedule_exceptions_select_all"
  on public.schedule_exceptions for select
  to anon, authenticated
  using (true);

create policy "schedule_exceptions_all_admin"
  on public.schedule_exceptions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- appointments
-- ---------------------------------------------------------------------------
-- Lectura: cada cliente ve solo sus turnos. Escritura directa: solo admin.
-- El cliente reserva, cancela y reprograma a través de los RPC, que validan
-- plazos, disponibilidad y precios.

create policy "appointments_select_own_or_admin"
  on public.appointments for select
  to authenticated
  using (client_id = public.current_client_id() or public.is_admin());

create policy "appointments_all_admin"
  on public.appointments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- internal_notes · solo el negocio
-- ---------------------------------------------------------------------------

create policy "internal_notes_all_admin"
  on public.internal_notes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- appointment_status_history · auditoría
-- ---------------------------------------------------------------------------
-- El cliente ve el estado actual de su turno; el historial de quién lo cambió
-- es información interna.

create policy "appointment_status_history_select_admin"
  on public.appointment_status_history for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- appointment_reminders · cola interna
-- ---------------------------------------------------------------------------

create policy "appointment_reminders_select_admin"
  on public.appointment_reminders for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- booking_attempts
-- ---------------------------------------------------------------------------
-- Sin policies a propósito: RLS activo y ninguna policy significa que nadie
-- la lee ni la escribe desde la aplicación. Solo la tocan book_appointment()
-- (SECURITY DEFINER) y el mantenimiento con service_role.
