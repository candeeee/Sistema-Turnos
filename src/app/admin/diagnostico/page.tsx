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
      detalle: [shape.message, shape.details, shape.hint, shape.code ? ERROR_CODES[shape.code] : null]
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

  const claveSecreta = Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
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
      ok: Boolean(isAdmin),
      detalle: isAdmin
        ? 'La base te reconoce como administrador'
        : 'La función respondió false: tu usuario no tiene rol admin en public.profiles',
    })
  }

  // --- Lectura de tablas ---------------------------------------------------
  const tablas = [
    'business_settings',
    'services',
    'business_hours',
    'schedule_exceptions',
    'appointments',
    'clients',
    'internal_notes',
    'appointment_reminders',
  ] as const

  for (const tabla of tablas) {
    const { count, error } = await supabase.from(tabla).select('*', { count: 'exact', head: true })
    push('Lectura', tabla, error, `${count ?? 0} filas visibles`)
  }

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
      ok: Boolean(settings),
      detalle: settings
        ? `Existe · zona horaria ${settings.timezone}`
        : 'No existe. Ejecutá: insert into public.business_settings (id) values (true);',
    })
  }

  // --- Escritura: el camino exacto que usa /admin/configuracion ------------
  // Escribe el mismo valor que ya tiene, así que no cambia nada. Sirve para
  // saber si la policy de UPDATE deja pasar la operación: si devuelve cero
  // filas, el formulario respondería "guardado" sin guardar.
  const { data: escrito, error: escrituraError } = await supabase
    .from('business_settings')
    .update({ timezone: settings?.timezone ?? 'America/Argentina/Buenos_Aires' })
    .eq('id', true)
    .select('id')
    .maybeSingle()

  if (escrituraError) {
    push('Escritura', 'UPDATE business_settings', escrituraError, '')
  } else {
    checks.push({
      grupo: 'Escritura',
      nombre: 'UPDATE business_settings',
      ok: Boolean(escrito),
      detalle: escrito
        ? 'La policy permite guardar la configuración'
        : 'El UPDATE no afectó ninguna fila: la policy business_settings_update_admin te está bloqueando',
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
    checks.push({
      grupo: 'RPC',
      nombre: 'Duración de los turnos futuros',
      ok: (drift?.length ?? 0) === 0,
      detalle:
        (drift?.length ?? 0) === 0
          ? 'Todos los turnos futuros bloquean la duración actual de su servicio'
          : `${drift?.length} turno(s) reservados con una duración distinta a la que hoy tiene su servicio. Bloquean la duración con la que se reservaron.`,
    })
  }

  // --- RPC del sitio público -----------------------------------------------
  const { data: servicio } = await supabase
    .from('services')
    .select('id, name, duration_min')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (!servicio) {
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
      const horarios = (slots ?? [])
        .slice(0, 12)
        .map((slot) => slot.slot_start.slice(11, 16))
        .join('  ')

      checks.push({
        grupo: 'Disponibilidad',
        nombre: 'get_available_slots()',
        ok: true,
        detalle: `${slots?.length ?? 0} horarios mañana para "${servicio.name}" (${servicio.duration_min} min)${
          (slots?.length ?? 0) === 0
            ? ' · revisá las franjas en /admin/horarios'
            : ` · en UTC: ${horarios}${(slots?.length ?? 0) > 12 ? '…' : ''}`
        }`,
      })
    }
  }

  // --- Esquema al día ------------------------------------------------------
  // Se piden las columnas por nombre en lugar de `select('*')`: así, si una
  // migración no se aplicó, PostgREST responde PGRST204 con el nombre exacto
  // de la columna que falta en vez de devolver la fila incompleta en silencio.
  const columnasEsperadas = [
    { columna: 'cancellation_policy', migracion: '20260730120000_fixes.sql' },
    { columna: 'reminders_enabled', migracion: '20260730120000_fixes.sql' },
    { columna: 'second_reminder_enabled', migracion: '20260731110000_notifications.sql' },
    { columna: 'second_reminder_hours', migracion: '20260731110000_notifications.sql' },
    { columna: 'message_confirmation', migracion: '20260731110000_notifications.sql' },
    { columna: 'message_reminder', migracion: '20260731110000_notifications.sql' },
    { columna: 'message_cancellation', migracion: '20260731110000_notifications.sql' },
    { columna: 'message_status_change', migracion: '20260731110000_notifications.sql' },
  ]

  const { data: columnas, error: columnasError } = await supabase
    .from('business_settings')
    .select(columnasEsperadas.map((item) => item.columna).join(','))
    .maybeSingle()

  if (columnasError) {
    const faltante = columnasEsperadas.find((item) =>
      columnasError.message.includes(item.columna),
    )

    checks.push({
      grupo: 'Esquema',
      nombre: 'Columnas de notificaciones',
      ok: false,
      code: columnasError.code,
      detalle: faltante
        ? `Falta la columna "${faltante.columna}". Aplicá la migración ${faltante.migracion}.`
        : `${columnasError.message}. Aplicá las migraciones pendientes con: npx supabase db push`,
    })
  } else {
    const fila = (columnas ?? {}) as Record<string, unknown>
    const vacias = ([
      'message_confirmation',
      'message_reminder',
      'message_cancellation',
      'message_status_change',
    ] as const).filter((clave) => String(fila[clave] ?? '').trim() === '')

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

  // --- Storage -------------------------------------------------------------
  const { error: storageError } = await supabase.storage.from('services').list('', { limit: 1 })
  push('Storage', 'Bucket services', storageError, 'Accesible')

  return checks
}

export default async function DiagnosticsPage() {
  const checks = await runChecks()
  const fallos = checks.filter((check) => !check.ok)

  const grupos = checks.reduce<Record<string, Check[]>>((acc, check) => {
    ;(acc[check.grupo] ??= []).push(check)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-3xl sm:text-4xl">Diagnóstico</h1>
        <p className="mt-2 text-sm text-muted">
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
          : `${fallos.length} ${fallos.length === 1 ? 'prueba falló' : 'pruebas fallaron'}. El detalle de cada una está abajo, con el código de error.`}
      </p>

      {Object.entries(grupos).map(([grupo, items]) => (
        <section key={grupo}>
          <h2 className="mb-3 text-xs uppercase tracking-[0.15em] text-muted">{grupo}</h2>

          <ul className="flex flex-col gap-2">
            {items.map((check) => (
              <li
                key={`${grupo}-${check.nombre}`}
                className="flex flex-wrap items-start gap-x-4 gap-y-1 rounded-[var(--radius-card)] border border-line bg-surface px-5 py-3.5"
              >
                <span aria-hidden className="text-sm">
                  {check.ok ? '✅' : '❌'}
                </span>
                <span className="tnum min-w-52 text-sm">{check.nombre}</span>
                <span className="min-w-0 flex-1 text-sm text-muted">{check.detalle}</span>
                {check.code && (
                  <span className="tnum rounded-full bg-paper px-2.5 py-1 text-xs">{check.code}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
