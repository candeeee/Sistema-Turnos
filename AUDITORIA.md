# Auditoría técnica — Sistema de turnos

Revisión completa del código y de las migraciones, con la causa exacta de cada
error reportado y un plan de corrección por fases.

**Alcance:** los 102 archivos del proyecto, las 6 migraciones y el contrato
entre el código TypeScript y la base de datos.
**Estado general:** la arquitectura es correcta y no hay que rehacerla. Hay
**4 defectos bloqueantes**, todos en la capa SQL, y son la causa de
prácticamente todos los síntomas que estás viendo.

---

## 1. Resumen ejecutivo

| # | Defecto | Severidad | Síntoma que provoca |
|---|---------|-----------|---------------------|
| 1 | `anon` no tiene permiso de ejecución sobre `is_admin()` | 🔴 Bloqueante | El sitio público falla para visitantes sin sesión |
| 2 | Enum `reminder_status` sin cast explícito en 3 lugares | 🔴 Bloqueante | Error al crear o mover cualquier turno |
| 3 | Referencia a tres niveles en `ON CONFLICT DO UPDATE` | 🔴 Bloqueante | Falla el mismo trigger de recordatorios |
| 4 | `experimental.typedRoutes` con rutas dinámicas | 🔴 Bloqueante | `npm run build` no compila |
| 5 | Policies sobre `storage.objects` desde migración | 🟠 Alto | La migración 04 puede abortar por permisos |
| 6 | Claves de API de Supabase con nomenclatura vieja | 🟠 Alto | Proyectos nuevos ya no muestran `anon`/`service_role` |
| 7 | Sin logging estructurado en Server Actions | 🟠 Alto | Todo error llega al navegador como *Failed to fetch* |

Los defectos 1, 2 y 3 explican por qué tuviste que ir corrigiendo cosas a mano
durante la instalación: **la base que tenés ahora ya no coincide con las
migraciones del repositorio**, y esa divergencia es el problema de fondo. El
primer paso de la corrección no es tocar código: es medir la diferencia con
`supabase/verificacion.sql`.

---

## 2. Los cuatro defectos bloqueantes, en detalle

### 2.1 🔴 `anon` no puede ejecutar `is_admin()`

**Dónde:** `20260729120100_functions.sql` línea 723 y
`20260729120200_policies.sql` línea 58.

La migración 02 revoca los permisos por defecto y después los otorga uno por
uno:

```sql
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;   -- ← falta anon
```

Pero la policy de lectura de servicios evalúa esa función para **cualquiera**,
incluido un visitante sin sesión:

```sql
create policy "services_select_active"
  on public.services for select
  to anon, authenticated
  using (is_active or public.is_admin());   -- ← anon evalúa is_admin()
```

**Consecuencia:** un visitante no autenticado que entra a `/` o `/servicios`
recibe `permission denied for function is_admin`. PostgreSQL **no garantiza**
el cortocircuito del `OR`: puede evaluar `is_admin()` incluso cuando
`is_active` es verdadero.

**Causa raíz:** una policy pensada para dos audiencias distintas metida en una
sola expresión. La corrección no es solo dar el permiso: hay que separar las
policies por rol, que además es más rápido porque `anon` deja de llamar a una
función en cada fila.

```sql
-- Corrección
drop policy "services_select_active" on public.services;

create policy "services_select_public"
  on public.services for select
  to anon, authenticated
  using (is_active);

create policy "services_select_admin"
  on public.services for select
  to authenticated
  using (public.is_admin());

grant execute on function public.is_admin() to anon;
```

El `grant` a `anon` se agrega igual porque el middleware y varias policies
pueden evaluarla antes de que la sesión esté establecida.

---

### 2.2 🔴 Enum `reminder_status` sin cast

**Dónde:** `20260729120100_functions.sql`, líneas 300 y 710.

```sql
values (new.id, v_when, case when v_when > now() then 'pending' else 'cancelled' end)
```

Un literal suelto (`'pending'`) tiene tipo `unknown` y PostgreSQL lo convierte
al tipo de la columna sin problema. Pero una expresión `CASE` con dos literales
resuelve a **`text`**, y `text → enum` **no** tiene conversión implícita:

```
ERROR: column "status" is of type reminder_status but expression is of type text
```

Es exactamente el error que reportaste. Afecta a `appointments_sync_reminder()`
—que se dispara al crear, confirmar, cancelar o mover **cualquier** turno— y a
`mark_reminder_sent()`.

```sql
-- Corrección: castear el resultado del CASE, no cada literal
... case when v_when > now() then 'pending' else 'cancelled' end::public.reminder_status
... set status = (case when p_success then 'sent' else 'failed' end)::public.reminder_status
```

---

### 2.3 🔴 Referencia a tres niveles en `ON CONFLICT`

**Dónde:** `20260729120100_functions.sql`, línea 303.

```sql
on conflict (appointment_id, kind) do update
  set status = case
                 when public.appointment_reminders.status = 'sent' then 'sent'
```

Dentro de `ON CONFLICT DO UPDATE`, la tabla destino se referencia por su
**nombre sin esquema**. Con `public.appointment_reminders.status` PostgreSQL
responde `missing FROM-clause entry for table "public"`.

```sql
-- Corrección
when appointment_reminders.status = 'sent' then 'sent'
```

Los tres defectos anteriores viven en la misma función, así que se corrigen en
una sola migración.

---

### 2.4 🔴 `typedRoutes` rompe el build

**Dónde:** `next.config.ts` línea 23, y 6 componentes con rutas construidas.

```ts
experimental: { typedRoutes: true }
```

Con esa bandera, Next tipa `href` como una unión de rutas literales conocidas.
Cualquier ruta armada con template string deja de compilar:

```tsx
href={`/admin/clientes/${client.id}`}   // ❌ Type 'string' is not assignable to 'Route'
```

Aparece en `AdminNav`, dashboard, calendario, listado de clientes, ficha del
cliente y tabla de turnos. `npm run dev` no lo muestra —no hace type-check
completo—, pero `npm run build` falla.

**Corrección:** desactivar `typedRoutes`. La alternativa (tipar cada href con
`Route<string>`) agrega ruido en 20 lugares a cambio de nada: los links
dinámicos ya están cubiertos por el tipado de los parámetros.

---

## 3. Por qué ves *Failed to fetch* y cómo encontrar la causa real

`TypeError: Failed to fetch` **no es un error de tu aplicación**: es el
navegador diciendo que una petición murió sin respuesta HTTP. En Next.js 15
aparece en dos situaciones:

1. **Navegación a una ruta cuyo Server Component lanzó una excepción no
   capturada** — el servidor corta la respuesta RSC a mitad de camino y el
   cliente ve una petición abortada.
2. **Server Action que revienta antes de serializar su respuesta.**

En los dos casos, **el error real está en la terminal donde corre
`npm run dev`, no en el navegador.** El overlay del navegador solo muestra el
síntoma.

### Qué provoca la excepción en `/admin/configuracion`

Esa página ejecuta, en este orden:

```
middleware → supabase.rpc('is_admin')
  → admin/layout.tsx → requireAdmin() → supabase.rpc('is_admin')
    → getBusinessSettings() → select * from business_settings
      → SettingsForm
```

Los candidatos concretos, en orden de probabilidad:

| Causa | Cómo confirmarla |
|---|---|
| `is_admin()` no existe o quedó con otra firma tras las correcciones manuales | Bloque 1 de `verificacion.sql` |
| `is_admin()` sin permiso para el rol que la invoca | Bloque 3 de `verificacion.sql` |
| `business_settings` sin la fila única → `.single()` devuelve error | `select * from business_settings;` |
| Variables de entorno mal cargadas → `next.config.ts` lanza en cada request | La excepción aparece al arrancar `npm run dev` |
| El proceso de `next dev` se cayó | La terminal muestra el stack |

`getBusinessSettings()` usa `.single()`, que **falla** si hay cero filas.
La migración inserta esa fila, pero si durante las correcciones manuales
recreaste la tabla sin el `insert`, todo el sitio deja de renderizar.

### Sobre `where id;`

No es SQL inválido. `business_settings.id` es de tipo `boolean` y
`where id` equivale a `where id = true` —es el patrón estándar para forzar una
tabla de fila única—. Dicho eso, se lee como un error y ya te hizo dudar una
vez, así que en la Fase 1 se reescribe como `where id = true` en los 7 lugares
donde aparece. Claridad sobre concisión.

### Logging estructurado

Hoy los servicios registran `console.error('[getX]', error)`. Eso pierde
`code`, `details` y `hint`, que son justamente los campos que dicen qué falló
en PostgreSQL. La Fase 2 introduce un helper único:

```ts
// src/utils/log.ts
export function logError(action: string, error: unknown, payload?: unknown) {
  const pg = error as Partial<PostgrestError> & { stack?: string }
  console.error({
    action,
    payload,
    message: pg?.message,
    code: pg?.code,       // 23P01, 42501, PGRST202…
    details: pg?.details,
    hint: pg?.hint,
    stack: pg?.stack,
    at: new Date().toISOString(),
  })
}
```

Con eso, un `PGRST202` ("función no encontrada") deja de ser *Failed to fetch*
y pasa a decir qué RPC falta y con qué firma se la llamó.

---

## 4. Auditoría por área

### 4.1 Base de datos

| Archivo | Estado | Detalle |
|---|---|---|
| `20260729120000_schema.sql` | ⚠ Revisar | Estructura correcta. `internal_notes` referencia `appointments` y se crea después: el orden está bien, pero conviene documentarlo. Falta índice en `internal_notes(appointment_id)` cuando se filtre por turno |
| `20260729120100_functions.sql` | ❌ Incorrecto | Defectos 2.2 y 2.3. Además el `revoke` masivo de la línea 723 es demasiado ancho: alcanza funciones creadas después si se reordenan las migraciones |
| `20260729120200_policies.sql` | ❌ Incorrecto | Defecto 2.1. El resto de las policies es correcto |
| `20260729120300_storage.sql` | ⚠ Revisar | `create policy on storage.objects` requiere ser dueño de la tabla. En proyectos Supabase recientes el rol `postgres` no siempre lo es y la migración aborta con `must be owner of table objects`. Hay que envolverlo en un bloque tolerante y documentar la alternativa por dashboard |
| `20260729130000_available_days.sql` | ✅ Correcto | El `having` es redundante (el `cross join lateral` ya elimina los días vacíos), pero no molesta |
| `20260729140000_admin.sql` | ✅ Correcto | Verifica `is_admin()` explícitamente, como corresponde a una función `SECURITY DEFINER` |

**Código muerto:** ninguno. Las 13 funciones se usan.
**Funciones llamadas desde Next.js que podrían no existir en tu base:** las 13
están en el bloque 1 de `verificacion.sql`; ahí se confirma una por una.

### 4.2 Clientes de Supabase y sesión

| Archivo | Estado | Detalle |
|---|---|---|
| `lib/supabase/server.ts` | ✅ Correcto | `getAll`/`setAll` con `await cookies()`, la API vigente |
| `lib/supabase/middleware.ts` | ✅ Correcto | Usa `getUser()` y no `getSession()`, que es lo correcto para decidir permisos |
| `lib/supabase/client.ts` | ✅ Correcto | — |
| `lib/supabase/admin.ts` | ✅ Correcto | `service_role` solo en servidor, sin `persistSession` |
| `lib/env.ts` | ⚠ Revisar | Supabase migró a claves `sb_publishable_…` / `sb_secret_…`. Los proyectos creados en 2025 o después ya no muestran `anon`/`service_role` con esos nombres. Hay que aceptar ambas nomenclaturas |
| `middleware.ts` | ⚠ Revisar | Un `rpc('is_admin')` por request a `/admin`. Se puede resolver leyendo el rol una sola vez por request |

### 4.3 Next.js

| Archivo | Estado | Detalle |
|---|---|---|
| `next.config.ts` | ❌ Incorrecto | Defecto 2.4. Además lanzar en la carga del config rompe herramientas que importan el archivo sin `.env` |
| Layouts y route groups | ✅ Correcto | `(public)`, `(auth)` y `admin` bien separados |
| `app/admin/layout.tsx` | ✅ Correcto | Segunda capa de control, con RLS como tercera |
| `app/(public)/**` | ✅ Correcto | Todo Server Components salvo lo que necesita estado |
| `app/api/cron/mantenimiento/route.ts` | ⚠ Revisar | Compara el secreto con `!==`, vulnerable a timing attack. Menor, pero es una API pública |

### 4.4 Server Actions

Las 15 acciones siguen el patrón correcto (validación Zod → Supabase →
`revalidatePath`). Lo que falta es el manejo de errores:

| Problema | Archivos | Estado |
|---|---|---|
| Sin logging estructurado | los 8 archivos de `lib/actions` | ❌ |
| `redirect()` dentro de `try`: Next lo implementa lanzando una excepción, y un `catch` la tragaría | `actions/auth.ts` | ⚠ (hoy no hay `try`, pero es una trampa para quien continúe) |
| `revalidatePath` con rutas escritas a mano | `actions/admin/*` | ⚠ Centralizar en `ROUTES` |
| Sin `redirect` tras guardar en el panel | `admin/services`, `admin/settings` | ⚠ UX: el usuario no sabe si quedó guardado hasta que mira el cartel |

### 4.5 Panel

| Pantalla | Estado | Detalle |
|---|---|---|
| Dashboard | ⚠ | Depende de `admin_dashboard_stats()`. Si esa función falta, la página muestra ceros en silencio en vez de avisar |
| Calendario | ✅ | Renderizado en servidor, estado en la URL |
| Turnos | ⚠ | El `select` de estado ofrece los terminales, que el trigger rechaza. Hay que filtrar las transiciones válidas en la UI |
| Clientes | ✅ | — |
| Ficha de cliente | ⚠ | `history = appointments.filter(a => !upcoming.includes(a))` es O(n²); irrelevante con 50 turnos, no con 5.000 |
| Servicios | ⚠ | Al cambiar la imagen, la anterior queda huérfana en Storage |
| Horarios | ✅ | — |
| Configuración | ⚠ | No permite cambiar la zona horaria, que hoy solo se toca por SQL |
| **Administradores** | ❌ **Falta** | No existe pantalla. Hoy se promueve solo por SQL. Lo pedís explícitamente en la auditoría y no está construido |

### 4.6 Sitio público

| Pantalla | Estado | Detalle |
|---|---|---|
| Inicio | ❌ | Rota para visitantes sin sesión por el defecto 2.1 |
| Servicios | ❌ | Misma causa |
| Reserva | ⚠ | Sin estado de carga entre "elegir día" y la llegada de los horarios más allá de un texto |
| Mi cuenta | ✅ | — |
| Contacto | ✅ | — |

### 4.7 Autenticación

| Función | Estado | Detalle |
|---|---|---|
| Registro | ✅ | Nombre y teléfono viajan en metadata y el trigger crea la ficha |
| Login | ✅ | Mensaje genérico, no revela si el email existe |
| Logout | ✅ | — |
| Confirmación por email | ✅ | `/auth/callback` intercambia el código |
| **Recuperación de contraseña** | ❌ **Falta** | No hay `/recuperar` ni pantalla de nueva contraseña. El callback ya está preparado |
| Roles | ⚠ | Correcto en la base, sin UI |
| Middleware y cookies | ✅ | — |

### 4.8 Validaciones, performance y seguridad

- **Zod** ⚠ — `package.json` permite `^3.23.8`, pero `zod@4` rompe
  `errorMap` y `z.string().email()`. Hay que fijar el rango.
- **Tipos** ⚠ — `database.types.ts` está escrito a mano. Debe regenerarse con
  `npm run db:types` contra la base real: es el único modo de garantizar que
  código y base coinciden.
- **N+1** ✅ — No hay. Las agregaciones están en SQL y las relaciones se
  traen con joins de PostgREST.
- **Consultas repetidas** ⚠ — `is_admin()` se llama hasta 3 veces por request
  del panel (middleware, guard, `getSessionContext`).
- **Seguridad** ✅ — `service_role` nunca llega al navegador, RLS activo en
  las 11 tablas, escrituras sensibles vía RPC `SECURITY DEFINER` con
  verificación explícita. El único agujero real es el inverso del habitual:
  permisos de más restrictivos de la cuenta (defecto 2.1).

### 4.9 UX

| Problema | Dónde |
|---|---|
| Errores que se tragan y muestran datos vacíos | `getDashboardStats`, `getAvailableSlots`, `getClientNotes` devuelven vacío ante un error |
| Sin `loading.tsx` ni `error.tsx` | todas las rutas |
| Sin `not-found.tsx` | — |
| Guardado sin confirmación persistente | formularios del panel |

---

## 5. La decisión que hay que tomar antes de escribir una línea

Pediste una base para **reutilizar con muchos clientes**. Hoy el sistema es
explícitamente de un solo negocio: `business_settings` es una fila única y
ninguna tabla tiene columna de pertenencia. Hay dos caminos, y son
incompatibles entre sí:

### Camino A — Una instancia por cliente

Un proyecto de Supabase y un deploy por negocio. El código queda como está.

- Aislamiento total de datos: el mejor argumento comercial y legal.
- Cada cliente puede tener su dominio y su marca.
- Costo por cliente y mantenimiento de N deploys; una corrección se propaga
  con `git pull` en cada uno.
- **Cambios necesarios: ninguno.** Solo automatizar el alta con un script.

### Camino B — Multi-tenant real

Una sola base con `tenant_id` en todas las tablas.

- Un deploy, un costo, actualizaciones instantáneas para todos.
- Requiere: tabla `tenants`, `tenant_id` en las 11 tablas, reescribir las 24
  policies para filtrar por tenant, resolver el tenant por subdominio en el
  middleware, y **rehacer el constraint de exclusión** para que sea por tenant.
- Un error en una policy expone los datos de un cliente a otro. Es el riesgo
  más caro del proyecto.

**Recomendación:** camino A hasta los primeros 8–10 clientes, y B cuando el
producto esté validado y el costo operativo lo justifique. Migrar de A a B es
trabajoso pero acotado; migrar de B a A después de una filtración de datos es
imposible. Esta auditoría asume el camino A. Si elegís B, la Fase 7 cambia por
completo y hay que planificarla aparte.

---

## 6. Plan de corrección por fases

### Fase 0 — Medir la divergencia
**Objetivo:** saber exactamente en qué difiere tu base de las migraciones.
**Archivos:** `supabase/verificacion.sql` (ya creado, solo lectura).
**Riesgos:** ninguno.
**Pruebas:** ejecutar los 5 bloques y guardar el resultado.
**Criterio de cierre:** tenés la lista de objetos faltantes o con firma
distinta. Sin esto, cualquier corrección es a ciegas.

---

### Fase 1 — Base de datos
**Objetivo:** eliminar los defectos 2.1, 2.2, 2.3 y dejar migraciones
reproducibles desde cero.
**Archivos:** nueva migración `20260730_fixes.sql`; corrección de las
migraciones 02, 03 y 04 para instalaciones nuevas.
**Cambios:**
1. Cast explícito de `reminder_status` en los 3 puntos.
2. `ON CONFLICT` sin esquema.
3. Separar `services_select_active` en dos policies y otorgar `is_admin()` a `anon`.
4. `where id = true` en los 7 lugares.
5. Policies de Storage tolerantes a fallo de permisos, con instrucciones alternativas.
6. Índice en `internal_notes(appointment_id)`.

**Riesgos:** las funciones se recrean con `create or replace`; si tu base tiene
versiones modificadas a mano, se pisan. Es lo buscado, pero hay que hacer
backup antes (`supabase db dump`).
**Pruebas:**
- `verificacion.sql` sin filas ❌.
- Crear un turno de prueba → se crea la fila en `appointment_reminders`.
- Cancelarlo → el recordatorio pasa a `cancelled`.
- `select * from services` con el rol `anon` desde el SQL Editor.
- Reservar el mismo horario desde dos sesiones → la segunda recibe el mensaje
  de horario ocupado, no un error 500.

**Criterio de cierre:** `supabase db reset` en local reproduce el esquema
completo sin una sola intervención manual.

---

### Fase 2 — Observabilidad y errores
**Objetivo:** que ningún error vuelva a llegar como *Failed to fetch*.
**Archivos:** nuevo `utils/log.ts`; los 8 archivos de `lib/actions`; los 9 de
`lib/services`; nuevos `error.tsx`, `loading.tsx` y `not-found.tsx`.
**Cambios:** logging estructurado con `code`/`details`/`hint`/`stack`, errores
que se propagan en lugar de devolver vacío, y límites de error por ruta.
**Riesgos:** bajos.
**Pruebas:** apagar la base y navegar el panel: cada pantalla muestra un
mensaje entendible y la terminal, el objeto completo.
**Criterio de cierre:** ningún `console.error` suelto y ninguna función que
devuelva vacío para ocultar un fallo.

---

### Fase 3 — Configuración y build
**Objetivo:** que `npm run build` y `npm run typecheck` pasen limpios.
**Archivos:** `next.config.ts`, `package.json`, `lib/env.ts`, `.env.example`.
**Cambios:** desactivar `typedRoutes`; fijar `zod` a `~3.23`; aceptar las
claves nuevas (`sb_publishable_…`, `sb_secret_…`) y las viejas; validar el
entorno sin lanzar durante la carga del config.
**Pruebas:** build limpio y arranque con cada nomenclatura de claves.
**Criterio de cierre:** cero errores y cero warnings de tipos.

---

### Fase 4 — Autenticación completa
**Objetivo:** cerrar los huecos del ciclo de vida de la cuenta.
**Archivos:** nuevos `(auth)/recuperar` y `(auth)/nueva-contrasena`;
`actions/auth.ts`; nueva pantalla `/admin/administradores`.
**Cambios:** recuperación de contraseña de punta a punta y ABM de
administradores desde el panel, con la regla de que nadie puede quitarse a sí
mismo el último rol de admin.
**Riesgos:** el ABM de roles es la funcionalidad más sensible del sistema;
toda la lógica va en un RPC `SECURITY DEFINER` con verificación explícita.
**Pruebas:** recuperar contraseña, promover y degradar administradores,
intentar degradar al último que queda.
**Criterio de cierre:** no queda ninguna operación que exija SQL Editor salvo
la creación del primer administrador.

---

### Fase 5 — Panel y sitio público
**Objetivo:** corregir los ⚠ de las secciones 4.5, 4.6 y 4.9.
**Archivos:** `AppointmentsTable`, ficha de cliente, `ServicesManager`,
`SettingsForm`, flujo de reserva.
**Cambios:** transiciones de estado válidas en la UI, historial paginado,
borrado de la imagen anterior al reemplazarla, zona horaria editable,
skeletons de carga y confirmaciones persistentes.
**Pruebas:** recorrer las 9 pantallas del panel y las 5 públicas con datos
reales y con datos vacíos.
**Criterio de cierre:** ninguna pantalla en blanco y ningún estado sin
feedback.

---

### Fase 6 — Rendimiento y documentación
**Objetivo:** una sola resolución de rol por request y un README que sirva
como documentación técnica y funcional completa.
**Archivos:** `middleware.ts`, `services/session.ts`, `services/admin/guard.ts`,
`README.md` (reescrito de cero con las 16 secciones que pediste: descripción,
arquitectura, instalación, Supabase paso a paso, variables, flujos,
funcionalidades con checklist, pendientes por prioridad, roadmap, problemas
conocidos, errores frecuentes, decisiones técnicas, mantenimiento, tareas,
changelog y esta auditoría).
**Pruebas:** instalación desde cero en un proyecto de Supabase nuevo siguiendo
solo el README, sin conocimiento previo.
**Criterio de cierre:** un desarrollador que nunca vio el proyecto lo levanta
en menos de 30 minutos.

---

### Fase 7 — Producto reutilizable
**Objetivo:** convertir el proyecto en la base comercial (camino A).
**Cambios:** script de alta de cliente nuevo (crea proyecto, aplica
migraciones, carga configuración inicial y primer administrador), tematización
por variables CSS, y checklist de puesta en producción.
**Criterio de cierre:** dar de alta un cliente nuevo lleva menos de una hora y
no requiere tocar código.

---

## 7. Orden recomendado

Fase 0 y Fase 1 son urgentes: hasta que no estén, cualquier prueba del resto
del sistema da resultados falsos. Fases 2 y 3 son un día de trabajo y evitan
volver a depurar a ciegas. De la 4 en adelante ya es construcción sobre una
base confiable.

**Nada de esto requiere rehacer la arquitectura.** El modelo de datos, la
separación de capas, el uso de RPC para las escrituras críticas y RLS como
última línea son correctos y resisten el crecimiento. Lo que falla es
puntual, está localizado y es corregible en el orden de arriba.
