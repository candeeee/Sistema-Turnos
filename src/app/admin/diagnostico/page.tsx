import { createClient } from '@/lib/supabase/server'
import { describeError, ERROR_CODES } from '@/utils/log'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Diagnóstico' }

type Check = {
  grupo: string
  nombre: string
  ok: boolean
  detalle: string
  code?: string
}

/**
 * Columnas que agregaron las migraciones posteriores a la instalación inicial.
 *
 * El select de abajo las pide **por nombre y como literal**: si alguna no
 * existe, PostgREST responde PGRST204 nombrándola, y el diagnóstico puede
 * decir qué migración falta. Con `select('*')` la fila llegaría incompleta en
 * silencio, que es exactamente el fallo que documenta la sección 11.5 del
 * README.
 *
 * El literal y esta lista se mantienen juntos a propósito: si se agrega una
 * columna hay que tocar los dos, y quedan a la vista uno al lado del otro.
 */
const COLUMNAS_RECIENTES = 'cancellation_policy, reminders_enabled, second_reminder_enabled, second_reminder_hours, message_confirmation, message_reminder, message_cancellation, message_status_change' as const

const MIGRACION_POR_COLUMNA: Record<string, string> = {
  cancellation_policy: '20260730120000_fixes.sql',
  reminders_enabled: '20260730120000_fixes.sql',
  second_reminder_enabled: '20260731110000_notifications.sql',
  second_reminder_hours: '20260731110000_notifications.sql',
  message_confirmation: '20260731110000_notifications.sql',
  message_reminder: '20260731110000_notifications.sql',
  message_cancellation: '20260731110000_notifications.sql',
  message_status_change: '20260731110000_notifications.sql',
}

const PLANTILLAS = [
  'message_confirmation',
  'message_reminder',
  'message_cancellation',
  'message_status_change',
] as const

/**
 * Diagnóstico en caliente.
 *
 * Prueba cada dependencia usando exactamente la misma conexión, la misma
 * sesión y los mismos permisos que usa el resto del panel. Un script en el SQL
 * Editor corre como `postgres` y por eso puede dar verde mientras la
 * aplicación falla: acá corre como el usuario logueado, que es lo que importa.
 */
async function runChecks(): Promise<Check[]> {
  const supabase = await createClient()
  const checks: Check[] = []

  function push(grupo: string, nombre: string, error: unknown, okDetalle: string) {
    if (!error) {
      checks.push({ grupo, nombre, ok: true, detalle: okDetalle })
      return
    }

    const shape = describeError(error)
    checks.push({
      grupo,
      nombre,
      ok: false,
      code: shape.code,
      detalle: [
        shape.message,
        shape.details,
        shape.hint,
        shape.code ? ERROR_CODES[shape.code] : null,
      ]
        .filter(Boolean)
        .join(' · '),
    })
  }

  // --- Entorno -------------------------------------------------------------
  const usaClaveNueva = Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  checks.push({
    grupo: 'Entorno',
    nombre: 'Clave pública de Supabase',
    ok: true,
    detalle: usaClaveNueva
      ? 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (nomenclatura actual)'
      : 'NEXT_PUBLIC_SUPABASE_ANON_KEY (nomenclatura anterior, sigue siendo válida)',
  })

  const claveSecreta = Boolean(
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
  checks.push({
    grupo: 'Entorno',
    nombre: 'Clave secreta',
    ok: claveSecreta,
    detalle: claveSecreta
      ? 'Configurada (solo se usa en el mantenimiento)'
      : 'Sin configurar: el endpoint /api/cron/mantenimiento va a fallar',
  })

  checks.push({
    grupo: 'Entorno',
    nombre: 'CRON_SECRET',
    ok: Boolean(process.env.CRON_SECRET),
    detalle: process.env.CRON_SECRET
      ? 'Configurado'
      : 'Sin configurar: el mantenimiento automático queda deshabilitado',
  })

  // --- Sesión y rol --------------------------------------------------------
  const { data: userData, error: userError } = await supabase.auth.getUser()
  push('Sesión', 'Usuario autenticado', userError, userData.user?.email ?? 'sin email')

  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin')
  if (adminError) {
    push('Sesión', 'is_admin()', adminError, '')
  } else {
    checks.push({
      grupo: 'Sesión',
      nombre: 'is_admin()',
      ok: isAdmin === true,
      detalle:
        isAdmin === true
          ? 'La base te reconoce como administradora'
          : 'La función respondió false: tu usuario no tiene rol admin en public.profiles',
    })
  }

  // --- Lectura de tablas ---------------------------------------------------
  // Cada tabla se consulta por separado con su nombre literal: `from()` acepta
  // solo los nombres del esquema, así que un error de tipeo no compila.
  const { count: cSettings, error: eSettings } = await supabase
    .from('business_settings')
    .select('*', { count: 'exact', head: true })
  push('Lectura', 'business_settings', eSettings, `${cSettings ?? 0} filas visibles`)

  const { count: cServices, error: eServices } = await supabase
    .from('services')
    .select('*', { count: 'exact', head: true })
  push('Lectura', 'services', eServices, `${cServices ?? 0} filas visibles`)

  const { count: cHours, error: eHours } = await supabase
    .from('business_hours')
    .select('*', { count: 'exact', head: true })
  push('Lectura', 'business_hours', eHours, `${cHours ?? 0} filas visibles`)

  const { count: cExceptions, error: eExceptions } = await supabase
    .from('schedule_exceptions')
    .select('*', { count: 'exact', head: true })
  push('Lectura', 'schedule_exceptions', eExceptions, `${cExceptions ?? 0} filas visibles`)

  const { count: cAppointments, error: eAppointments } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
  push('Lectura', 'appointments', eAppointments, `${cAppointments ?? 0} filas visibles`)

  const { count: cClients, error: eClients } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
  push('Lectura', 'clients', eClients, `${cClients ?? 0} filas visibles`)

  const { count: cNotes, error: eNotes } = await supabase
    .from('internal_notes')
    .select('*', { count: 'exact', head: true })
  push('Lectura', 'internal_notes', eNotes, `${cNotes ?? 0} filas visibles`)

  const { count: cReminders, error: eReminders } = await supabase
    .from('appointment_reminders')
    .select('*', { count: 'exact', head: true })
  push('Lectura', 'appointment_reminders', eReminders, `${cReminders ?? 0} filas visibles`)

  // --- La fila única de configuración --------------------------------------
  const { data: settings, error: settingsError } = await supabase
    .from('business_settings')
    .select('id, timezone')
    .maybeSingle()

  if (settingsError) {
    push('Configuración', 'Fila única', settingsError, '')
  } else {
    checks.push({
      grupo: 'Configuración',
      nombre: 'Fila única',
      ok: settings !== null,
      detalle: settings
        ? `Existe · zona horaria ${settings.timezone}`
        : 'No existe. Ejecutá: insert into public.business_settings (id) values (true);',
    })
  }

  const zonaHoraria = settings?.timezone ?? 'America/Argentina/Buenos_Aires'

  // --- Escritura: el camino exacto que usa /admin/configuracion ------------
  // Escribe el mismo valor que ya tiene, así que no cambia nada. Sirve para
  // saber si la policy de UPDATE deja pasar la operación: si devuelve cero
  // filas, el formulario respondería "guardado" sin guardar.
  const { data: escrito, error: escrituraError } = await supabase
    .from('business_settings')
    .update({ timezone: zonaHoraria })
    .eq('id', true)
    .select('id')
    .maybeSingle()

  if (escrituraError) {
    push('Escritura', 'UPDATE business_settings', escrituraError, '')
  } else {
    checks.push({
      grupo: 'Escritura',
      nombre: 'UPDATE business_settings',
      ok: escrito !== null,
      detalle: escrito
        ? 'La policy permite guardar la configuración'
        : 'El UPDATE no afectó ninguna fila: la policy business_settings_update_admin te está bloqueando',
    })
  }

  // --- Esquema al día ------------------------------------------------------
  const { data: columnas, error: columnasError } = await supabase
    .from('business_settings')
    .select(COLUMNAS_RECIENTES)
    .maybeSingle()

  if (columnasError) {
    const faltante = Object.keys(MIGRACION_POR_COLUMNA).find((columna) =>
      columnasError.message.includes(columna),
    )

    checks.push({
      grupo: 'Esquema',
      nombre: 'Columnas de notificaciones',
      ok: false,
      code: columnasError.code,
      detalle: faltante
        ? `Falta la columna "${faltante}". Aplicá la migración ${MIGRACION_POR_COLUMNA[faltante]}.`
        : `${columnasError.message}. Aplicá las migraciones pendientes: npx supabase db push`,
    })
  } else if (columnas === null) {
    checks.push({
      grupo: 'Esquema',
      nombre: 'Columnas de notificaciones',
      ok: false,
      detalle: 'No se pudo leer la fila de configuración.',
    })
  } else {
    const vacias = PLANTILLAS.filter((clave) => columnas[clave].trim() === '')

    checks.push({
      grupo: 'Esquema',
      nombre: 'Columnas de notificaciones',
      ok: vacias.length === 0,
      detalle:
        vacias.length === 0
          ? 'Las 8 columnas existen y las 4 plantillas tienen texto'
          : `${vacias.length} plantilla(s) vacías en la base: ${vacias.join(', ')}. La aplicación usa los textos por defecto; guardá una vez en /admin/notificaciones para fijarlos.`,
    })
  }

  // --- RPC que usa el panel ------------------------------------------------
  const { error: statsError } = await supabase.rpc('admin_dashboard_stats')
  push('RPC', 'admin_dashboard_stats()', statsError, 'Responde correctamente')

  const { error: listError } = await supabase.rpc('admin_list_clients', {
    p_search: '',
    p_limit: 1,
    p_offset: 0,
  })
  push('RPC', 'admin_list_clients()', listError, 'Responde correctamente')

  // Reproduce el camino exacto del cambio de estado: una función SECURITY
  // INVOKER llamando a is_terminal_status(). Si falta el GRANT, falla acá y no
  // sobre un turno real.
  const { error: guardError } = await supabase.rpc('check_status_guard')
  push(
    'RPC',
    'Permiso del guard de estados',
    guardError,
    'El trigger de cambio de estado puede ejecutar is_terminal_status()',
  )

  const { data: drift, error: driftError } = await supabase.rpc(
    'admin_appointments_duration_drift',
  )

  if (driftError) {
    push('RPC', 'Duración de los turnos futuros', driftError, '')
  } else {
    const desalineados = drift ?? []

    checks.push({
      grupo: 'RPC',
      nombre: 'Duración de los turnos futuros',
      ok: desalineados.length === 0,
      detalle:
        desalineados.length === 0
          ? 'Todos los turnos futuros bloquean la duración actual de su servicio'
          : `${desalineados.length} turno(s) reservados con una duración distinta a la que hoy tiene su servicio. Bloquean la duración con la que se reservaron.`,
    })
  }

  // --- Disponibilidad ------------------------------------------------------
  const { data: servicio } = await supabase
    .from('services')
    .select('id, name, duration_min')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (servicio === null) {
    checks.push({
      grupo: 'Disponibilidad',
      nombre: 'get_available_slots()',
      ok: false,
      detalle: 'No hay ningún servicio activo para probar. Cargá uno en /admin/servicios.',
    })
  } else {
    const manana = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)

    const { data: slots, error: slotsError } = await supabase.rpc('get_available_slots', {
      p_service_id: servicio.id,
      p_date: manana,
    })

    if (slotsError) {
      push('Disponibilidad', 'get_available_slots()', slotsError, '')
    } else {
      const libres = slots ?? []

      // Los horarios se muestran en UTC a propósito: es el valor crudo que
      // devuelve la base, sin la conversión que aplica el resto de la app. Si
      // acá se ven bien y en el sitio no, el problema es la zona horaria.
      const horarios = libres
        .slice(0, 12)
        .map((slot) => slot.slot_start.slice(11, 16))
        .join('  ')

      checks.push({
        grupo: 'Disponibilidad',
        nombre: 'get_available_slots()',
        ok: true,
        detalle: `${libres.length} horarios mañana para "${servicio.name}" (${servicio.duration_min} min)${
          libres.length === 0
            ? ' · revisá las franjas en /admin/horarios'
            : ` · en UTC: ${horarios}${libres.length > 12 ? '…' : ''}`
        }`,
      })
    }
  }

  // --- Storage -------------------------------------------------------------
  const { error: storageError } = await supabase.storage.from('services').list('', { limit: 1 })
  push('Storage', 'Bucket services', storageError, 'Accesible')

  return checks
}

export default async function DiagnosticsPage() {
  const checks = await runChecks()
  const fallos = checks.filter((check) => !check.ok)

  const grupos = checks.reduce<Record<string, Check[]>>((acc, check) => {
    const lista = acc[check.grupo]
    if (lista) lista.push(check)
    else acc[check.grupo] = [check]
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Instalación</p>
        <h1 className="mt-3 font-display text-4xl font-light sm:text-5xl">Diagnóstico</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Cada prueba usa la misma conexión y los mismos permisos que el resto del panel. Un script
          en el SQL Editor corre como <span className="tnum">postgres</span> y puede dar verde
          mientras la aplicación falla; esto no.
        </p>
      </header>

      <p
        className={`rounded-[var(--radius-card)] border p-5 text-sm ${
          fallos.length === 0
            ? 'border-status-completed/30 bg-status-completed/5 text-status-completed'
            : 'border-status-cancelled/30 bg-status-cancelled/5 text-status-cancelled'
        }`}
      >
        {fallos.length === 0
          ? 'Todas las pruebas pasaron. El sistema está correctamente instalado.'
          : `${fallos.length} ${fallos.length === 1 ? 'prueba falló' : 'pruebas fallaron'}. El detalle de cada una está abajo, con su código de error.`}
      </p>

      {Object.entries(grupos).map(([grupo, items]) => (
        <section key={grupo}>
          <h2 className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted">{grupo}</h2>

          <ul className="flex flex-col gap-2">
            {items.map((check) => (
              <li
                key={`${grupo}-${check.nombre}`}
                className="flex flex-wrap items-start gap-x-4 gap-y-1 rounded-[var(--radius-card)] border border-line bg-surface px-5 py-4 shadow-soft"
              >
                <span aria-hidden className="text-sm">
                  {check.ok ? '✅' : '❌'}
                </span>
                <span className="tnum min-w-52 text-sm">{check.nombre}</span>
                <span className="min-w-0 flex-1 text-sm leading-relaxed text-muted">
                  {check.detalle}
                </span>
                {check.code && (
                  <span className="tnum rounded-full bg-veil px-2.5 py-1 text-xs">{check.code}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
