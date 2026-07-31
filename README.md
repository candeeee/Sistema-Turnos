# Sistema de turnos

Sistema completo de reserva y gestión de turnos para un negocio: sitio público
donde los clientes reservan y panel de administración donde el negocio maneja
su agenda.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Supabase
(PostgreSQL, Auth, Storage, RLS).

---

## Índice

1. [Qué hace el sistema](#1-qué-hace-el-sistema)
2. [Modelo de producto](#2-modelo-de-producto)
3. [Instalación](#3-instalación)
4. [Configuración de Supabase](#4-configuración-de-supabase)
5. [Variables de entorno](#5-variables-de-entorno)
6. [Arquitectura](#6-arquitectura)
7. [Flujos del sistema](#7-flujos-del-sistema)
8. [Decisiones técnicas](#8-decisiones-técnicas)
9. [Estado de las funcionalidades](#9-estado-de-las-funcionalidades)
10. [Pendientes y roadmap](#10-pendientes-y-roadmap)
11. [Problemas conocidos y errores frecuentes](#11-problemas-conocidos-y-errores-frecuentes)
12. [Mantenimiento: cómo extender el sistema](#12-mantenimiento-cómo-extender-el-sistema)
13. [Checklists de deploy y pruebas](#13-checklists-de-deploy-y-pruebas)
14. [Changelog](#14-changelog)

---

## 1. Qué hace el sistema

### Para el cliente del negocio

Entra al sitio, ve los servicios con precio y duración, elige un día y un
horario **realmente disponible**, completa la reserva y recibe las
instrucciones para hacer la seña por transferencia. Desde *Mi cuenta* ve sus
próximos turnos, el historial, cancela y reprograma.

### Para el dueño del negocio

Entra a `/admin` y administra su operación diaria: agenda, servicios, turnos,
clientes y datos del negocio. No toca nada del diseño ni de la infraestructura.

### Objetivos de diseño del sistema

1. **Que sea imposible reservar dos veces el mismo horario**, incluso con dos
   personas confirmando en el mismo segundo.
2. **Que la agenda no se llene de turnos fantasma** que nunca pagaron la seña.
3. **Que el historial nunca mienta**: si cambia el precio de un servicio, los
   turnos ya reservados conservan lo que se le informó al cliente.
4. **Que ningún error falle en silencio.**

---

## 2. Modelo de producto

Cada instalación corresponde a **un único negocio**. No es multi-tenant y no va
a serlo: al vender el sistema a otro cliente se despliega una instancia nueva
conectada a su propia base de Supabase.

Eso divide las responsabilidades en dos, y la división es deliberada:

| Personalización del producto (desarrollo) | Administración del negocio (cliente) |
|---|---|
| Logo, favicon, colores, tipografías | Horarios, días laborales, bloqueos |
| Diseño, layout, componentes, animaciones | Servicios, precios, duraciones |
| Hero, banners, imágenes, estructura | Turnos, estados, observaciones |
| Textos institucionales | Clientes e historial |
| Migraciones y despliegue | Datos de contacto, seña, políticas |

**El panel no tiene —ni debe tener— ninguna pantalla para editar aspectos
visuales.** Si en algún momento se agrega una, se rompe la propuesta de valor:
el producto deja de ser un sistema diseñado y pasa a ser un editor de sitios.

La personalización visual se hace en tres lugares del código:

- `src/app/globals.css` → colores, tipografías, radios, curvas de animación.
- `src/app/layout.tsx` → fuentes de Google y metadatos.
- `public/` → logo y favicon.

---

## 3. Instalación

Requisitos: **Node.js 20 o superior** y una cuenta de
[Supabase](https://supabase.com). Recomendado:
[Supabase CLI](https://supabase.com/docs/guides/local-development).

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno
cp .env.example .env.local
#    Completar con los datos del proyecto (sección 5)

# 3. Migraciones (sección 4)
npx supabase link --project-ref <TU_PROJECT_REF>
npx supabase db push

# 4. Verificar que la instalación quedó completa (sección 4.4)

# 5. Levantar
npm run dev
```

### Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verifica tipos sin compilar |
| `npm run check:env` | Valida `.env.local` y prueba la conexión real con Supabase |
| `npm run check:types` | Verifica que `database.types.ts` siga siendo un archivo generado |
| `npm run check:deps` | Confirma que las versiones de Supabase sean las declaradas |
| `npm run check:queries` | Busca `select()` sin literal, que rompen la inferencia |
| `npm run check:responsive` | Busca patrones que desbordan la pantalla en celular |
| `npm run verify` | Corre la misma secuencia que Vercel: tipos, consultas y build |
| `npm run db:push` | Aplica las migraciones pendientes |
| `npm run db:reset` | Recrea la base local desde cero |
| `npm run db:types` | Regenera `src/types/database.types.ts` desde el esquema real |

---

## 4. Configuración de Supabase

### 4.1 Crear el proyecto

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Región más cercana a los clientes. Para Argentina: `South America (São Paulo)`.
3. Guardá la contraseña de la base: la pide el CLI.

### 4.2 Aplicar las migraciones

**Con CLI (recomendado):**

```bash
npx supabase login
npx supabase link --project-ref <TU_PROJECT_REF>
npx supabase db push
```

**Desde el dashboard**, ejecutar en el SQL Editor **en este orden exacto**:

| # | Archivo | Qué crea |
|---|---|---|
| 1 | `20260729120000_schema.sql` | Extensiones, enums, 11 tablas, índices, constraints |
| 2 | `20260729120100_functions.sql` | Funciones, triggers, RPC de reserva |
| 3 | `20260729120200_policies.sql` | Row Level Security |
| 4 | `20260729120300_storage.sql` | Bucket de imágenes y `promote_to_admin()` |
| 5 | `20260729130000_available_days.sql` | Disponibilidad por día para el calendario |
| 6 | `20260729140000_admin.sql` | Agregaciones del panel |
| 7 | `20260730120000_fixes.sql` | Correcciones de la auditoría |
| 8 | `20260730140000_permissions.sql` | Permiso de `is_terminal_status` y consistencia de bloques |
| 9 | `20260731100000_reminder_kinds.sql` | Segundo recordatorio (valor de enum, migración aparte) |
| 10 | `20260731110000_notifications.sql` | Plantillas de mensajes y cola con dos recordatorios |
| 11 | `20260731120000_message_defaults.sql` | Textos por defecto en la propia columna |

**Qué NO hacer:**

- ❌ Ejecutarlas fuera de orden. Las policies usan funciones del paso 2.
- ❌ Editar una migración ya aplicada. Los cambios van siempre en una migración
  nueva; editar una vieja hace que tu base y la del próximo deploy difieran.
- ❌ Corregir errores a mano en el SQL Editor sin dejar registro. Es la causa
  más común de que el código y la base dejen de coincidir.
- ❌ Desactivar RLS "para probar". Sin RLS, la clave pública del navegador da
  acceso total a la base.

**Qué revisar si alguna migración falla:**

- La 4 puede abortar con `must be owner of table objects` en algunos proyectos:
  el rol `postgres` no siempre es dueño de `storage.objects`. En ese caso, creá
  el bucket `services` desde **Storage → New bucket** (público) y sus policies
  desde **Storage → Policies**, y seguí con la 5.
- Si una migración corta a la mitad, volvé a ejecutarla completa: todas usan
  `create or replace` y `if not exists`.

### 4.3 Configurar la autenticación

**Authentication → URL Configuration:**

- **Site URL:** `http://localhost:3000` en desarrollo, el dominio real en producción.
- **Redirect URLs:** agregá `http://localhost:3000/auth/callback` y
  `https://tu-dominio.com/auth/callback`.

**Authentication → Providers → Email:** dejá activada la confirmación por email
en producción. En desarrollo podés desactivarla para no depender del correo.

### 4.4 Verificar que quedó bien instalado

Hay dos verificaciones y **conviene hacer las dos**, porque miran cosas
distintas:

**1. Desde la base** — ejecutá `supabase/verificacion.sql` completo en el SQL
Editor. Comprueba que existan los 5 enums, las 11 tablas, las 13 funciones con
su firma exacta, los 9 triggers, el constraint de exclusión, el bucket y la
fila de configuración. Cualquier fila en ❌ significa que falta algo.

**2. Desde la aplicación** — entrá a `/admin/diagnostico`. Corre pruebas
equivalentes pero **con tu sesión y tus permisos**, que es lo que realmente
importa: el SQL Editor ejecuta como `postgres` y puede dar verde mientras la
aplicación falla por un `GRANT` faltante.

El diagnóstico prueba, entre otras cosas, el `UPDATE` exacto que hace el
formulario de configuración, así que detecta el caso más traicionero: una
policy que bloquea la escritura sin devolver error.

### 4.5 Crear el primer administrador

Problema del huevo y la gallina: solo un administrador puede nombrar a otro.

1. Registrate en `/crear-cuenta` con el email del dueño del negocio.
2. Confirmá el email si la confirmación está activada.
3. En el SQL Editor:

```sql
select public.promote_to_admin('dueño@negocio.com');
```

4. Cerrá sesión y volvé a entrar. Ahora `/ingresar` te lleva a `/admin`.

### 4.6 Carga inicial de datos

Todo desde el panel, en este orden:

1. **`/admin/configuracion`** — nombre, contacto, redes, zona horaria, alias y
   porcentaje de seña, políticas.
2. **`/admin/horarios`** — franjas de atención. Un día sin franjas es un día
   cerrado y no aparece en el calendario.
3. **`/admin/servicios`** — al menos un servicio activo.

Sin esos tres pasos, `/reservar` no puede ofrecer ni un horario.

---

## 5. Variables de entorno

Supabase renombró sus claves de API. En proyectos creados desde 2025 vas a ver
**Publishable key** y **Secret key**; en proyectos anteriores, **anon public** y
**service_role**. El sistema acepta las dos nomenclaturas.

| Variable | Dónde se consigue | Para qué sirve | ¿Va al navegador? |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL | Endpoint del proyecto | Sí |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → Publishable | Clave de acceso público. Segura **porque** todas las tablas tienen RLS | Sí |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Ídem, proyectos anteriores | Alternativa a la anterior | Sí |
| `SUPABASE_SECRET_KEY` | Project Settings → API Keys → Secret | Ignora RLS. Solo bootstrap del admin y mantenimiento | **Nunca** |
| `SUPABASE_SERVICE_ROLE_KEY` | Ídem, proyectos anteriores | Alternativa a la anterior | **Nunca** |
| `NEXT_PUBLIC_SITE_URL` | Vos | Links de confirmación de email y metadatos | Sí |
| `CRON_SECRET` | `openssl rand -base64 32` | Protege `/api/cron/mantenimiento` | **Nunca** |

**Cuándo se usa cada una:**

- Las `NEXT_PUBLIC_*` se resuelven en tiempo de build y viajan al navegador.
  Cambiarlas exige reiniciar `npm run dev`.
- La clave secreta solo se lee dentro de `createAdminClient()`, que se usa
  únicamente en `/api/cron/mantenimiento`. Nunca en una ruta alcanzable desde
  el navegador.
- Si filtrás la clave secreta, rotala inmediatamente desde el panel de Supabase.

---

## 6. Arquitectura

### 6.1 Regla que sostiene todo

```
Server Component → Server Action → lib/services → Supabase
```

Ningún componente consulta la base directamente y ningún componente contiene
lógica de negocio. Las escrituras críticas —reservar, cancelar, reprogramar—
no pasan por un `INSERT` desde la aplicación: van por funciones RPC que
validan todo dentro de una transacción.

### 6.2 Estructura de carpetas

```
supabase/
  migrations/            Esquema completo, en orden de ejecución
  verificacion.sql       Verificación de instalación (solo lectura)

src/
  app/                                Rutas (App Router)
    (auth)/                           Ingresar y crear cuenta
    (public)/                         Sitio público, con header y footer
      page.tsx                        Inicio
      servicios/  contacto/           Catálogo y contacto
      reservar/                       Flujo de reserva
      mis-turnos/                     Turnos e historial del cliente
      mi-cuenta/                      Perfil de la persona (cliente y admin)
    admin/                            Panel (solo rol admin)
      calendario/ turnos/ clientes/
      servicios/ horarios/
      configuracion/ notificaciones/ diagnostico/
      error.tsx  loading.tsx          Límite de error y esqueleto de carga
    api/cron/                         Tareas programadas
    auth/callback/                    Confirmación de email
    error.tsx  not-found.tsx          Límites globales

  components/
    account/    Turnos del cliente: cancelar, reprogramar, editar datos
    admin/      Panel: navegación, tabla de turnos, editores, formularios
    booking/    Flujo de reserva: pasos, calendario, horarios, seña
    layout/     Header y footer
    site/       Piezas del sitio público
    ui/         Reutilizables sin lógica de negocio (Button, Field, Modal…)

  lib/
    navigation.ts Única fuente de verdad de la navegación, por rol
    actions/    Server Actions: única vía de escritura desde la interfaz
      admin/    Acciones del panel
    services/   Acceso a datos: todo lo que consulta Supabase vive acá
      admin/    Lecturas del panel y guard de administrador
    supabase/   Clientes: navegador, servidor, middleware, clave secreta
    validations/ Esquemas Zod compartidos entre cliente y servidor
    constants.ts Estados, etiquetas, colores, zonas horarias y rutas
    env.ts      Variables de entorno tipadas

  types/
    database.types.ts   GENERADO por supabase gen types. No editar a mano
    domain.ts           Tipos propios, derivados del anterior

  utils/       Funciones puras: fechas, formateo, errores, logging, imágenes
  middleware.ts  Refresco de sesión y protección de rutas
```

### 6.3 Cómo se comunican las capas

- **`app/`** solo compone: pide datos a `lib/services` y pasa acciones a los
  formularios. No consulta la base.
- **`lib/services`** es la única capa que habla con Supabase para **leer**.
  Cada función devuelve datos tipados o **lanza** `DataError`: nunca devuelve
  vacío para tapar un fallo.
- **`lib/actions`** es la única capa que **escribe**. Valida con Zod, llama a
  Supabase o a un RPC, registra el error completo y revalida las rutas
  afectadas.
- **`utils/`** no importa nada de Supabase ni de React: son funciones puras y
  por eso sirven en cliente y servidor por igual.

### 6.4 Las tres capas de seguridad

1. **Middleware** — evita renderizar el panel a quien no corresponde.
2. **Layout de `/admin`** — vuelve a comprobar el rol en el servidor.
3. **RLS** — aunque las dos anteriores fallen, la base no devuelve un solo
   registro ajeno.

El rol vive en `public.profiles`, **nunca** en `user_metadata`: esa metadata la
puede editar el propio usuario, así que guardarlo ahí permitiría que cualquiera
se convierta en administrador.

---

## 7. Flujos del sistema

### 7.1 Reserva

```
servicio → fecha → horario → datos → seña → pendiente de confirmación
```

1. El calendario pide `get_available_days()` una vez por mes visible y apaga
   los días sin lugar.
2. El selector de horarios pide `get_available_slots()` al abrir el día.
3. El modal de seña muestra el monto ya calculado, con alias y CBU copiables.
4. Al confirmar, `book_appointment()` revalida **todo** del lado del servidor:
   servicio activo, horario ofrecido, anticipación mínima, ventana máxima,
   límite de turnos pendientes, límite de reservas por hora y solapamiento.
5. El turno nace en `pending_confirmation` con `hold_expires_at`.

### 7.2 Disponibilidad

No existe una tabla de horarios disponibles. Se calculan al vuelo cruzando
franjas de atención, excepciones y turnos activos. Pre-generarlos obligaría a
regenerar millones de filas cada vez que el negocio cambia un horario, y a
mantener dos fuentes de verdad sincronizadas.

### 7.3 Administración

El panel escribe directo en las tablas, amparado por las policies de admin,
salvo donde hay reglas de negocio: los cambios de estado los valida un trigger
y los solapamientos, el constraint de exclusión.

Al mover un turno desde el panel **no** rige la ventana de anticipación que
limita al cliente: el negocio reacomoda su agenda cuando quiere. Lo único que
la base no permite es pisar otro turno activo.

### 7.4 Autenticación

`signUp` → el trigger `handle_new_user` crea el perfil y la ficha de cliente en
la misma transacción → confirmación por email → `/auth/callback` intercambia el
código por una sesión → el middleware refresca el token en cada request.

### 7.5 Servicios y clientes

Los servicios son la única entidad que el negocio crea desde cero. Los clientes
se crean solos al registrarse; el administrador puede editar sus datos y
agregar observaciones privadas, que viven en `internal_notes` y **nunca** son
visibles para el cliente.

### 7.6 Recordatorios

Cada turno activo encola su recordatorio automáticamente vía trigger. La
aplicación nunca escribe en esa tabla: si el turno se cancela o se mueve, la
cola se actualiza sola.

- `unique (appointment_id, kind)` hace **imposible** el envío duplicado.
- `get_due_reminders()` devuelve los vencidos con todo lo necesario para armar
  el mensaje.
- `mark_reminder_sent()` registra el resultado.

Falta únicamente el canal de envío. Conectarlo es implementar el envío dentro
de `/api/cron/mantenimiento` y llamar a `mark_reminder_sent()`. Ninguna otra
parte del sistema cambia.

---

## 7.7 Navegación

Una sola función decide qué ve cada persona: `src/lib/navigation.ts`. El
header de escritorio, el menú de celular y el pie consumen su resultado.

| | Sin sesión | Cliente | Administradora |
|---|---|---|---|
| Inicio | ✅ | ✅ | ✅ |
| Reservar turno | ✅ | ✅ | — |
| Mis turnos | — | ✅ | — |
| Mi cuenta | — | ✅ | ✅ |
| Ingresar | ✅ | — | — |
| Panel | — | — | ✅ |

"Inicio" está siempre, en todas las pantallas. El administrador no reserva
turnos ni tiene turnos propios, pero **sí tiene perfil**: por eso `/mi-cuenta`
(datos y contraseña) está separada de `/mis-turnos` (la agenda del cliente).
Esa separación es la que permite que las dos experiencias convivan sin
mezclarse, y el middleware la respalda: un administrador que escriba
`/reservar` o `/mis-turnos` a mano termina en el panel.

---

## 7.8 Diseño del panel en celular

El panel es una herramienta de trabajo que se usa tanto desde el mostrador
como desde el teléfono. Su estructura cambia según el ancho:

| | Celular | Escritorio (lg) |
|---|---|---|
| Navegación | Barra inferior fija, 4 accesos + "Más" | Columna lateral con los 9 |
| Encabezado | Barra superior con el nombre de la pantalla | El título de cada página |
| Métricas | 2 columnas | 4 columnas |
| Filtros de turnos | Plegados en un `<details>` | Siempre visibles |
| Acciones de cada fila | Ancho completo, apiladas | En línea, a la derecha |

**Por qué la navegación va abajo en celular.** En una pantalla sostenida con
una mano, el borde inferior es la zona más cómoda del alcance del pulgar y el
superior es la menos. La navegación que se usa todo el día va donde la mano
ya está. Los cuatro accesos diarios —inicio, agenda, turnos, clientes— ocupan
la barra; las pantallas de configuración viven en la hoja "Más", porque se
visitan de vez en cuando y no merecen un lugar permanente.

**Por qué los filtros están plegados.** Cinco campos ocupaban la pantalla
entera antes de mostrar un solo turno. El `<details>` se abre solo si hay
filtros activos, así quien llega desde un enlace filtrado entiende por qué el
listado está recortado. No usa JavaScript.

### La causa real del desborde horizontal

Casi siempre es la misma, y no es de Tailwind sino de CSS: **un hijo de flex o
de grid tiene `min-width: auto`, así que se niega a encogerse por debajo del
ancho de su contenido.** Una tabla ancha, un email largo o un input de fecha
adentro estiran el contenedor, y de ahí la página entera.

```tsx
<section className="overflow-x-auto">      // ❌ no contiene nada
<section className="min-w-0 overflow-x-auto">  // ✅ ahora sí scrollea
```

Por eso el layout del panel, el `main` y cada contenedor de listado llevan
`min-w-0`. `npm run check:responsive` marca los lugares donde falta.

Como respaldo, `globals.css` fija `overflow-x: clip` en `html` y `body`, los
campos de fecha y hora llevan `min-width: 0` —en iOS conservan un ancho
intrínseco propio y desbordan la tarjeta— y los párrafos y títulos
`overflow-wrap: break-word`, porque una palabra sin espacios rompe cualquier
caja.

---

## 8. Decisiones técnicas

**¿Por qué el entorno se valida con getters y no al importar el módulo?**
Porque un `throw` en el nivel superior de un módulo rompe el build de Next, no
solo el renderizado: al construir `/_not-found` se importa el layout raíz y
toda su cadena, y el error llega como `Failed to collect page data`, sin
mencionar la variable que falta. Validar en el primer acceso conserva el mismo
mensaje claro y no puede tumbar una compilación.

**¿Por qué las versiones de Supabase están fijadas exactas?**
Porque el archivo de tipos solo puede coincidir con un sistema de tipos, y
`@supabase/supabase-js` cambió el suyo entre versiones menores. Con un rango
abierto, `npm install` en otra máquina —o en Vercel— puede traer una versión
distinta y romper el build sin que nadie haya tocado una línea. Las
dependencias de las que depende el tipado no llevan `^`.

**¿Por qué los tipos generados y los propios viven separados?**
Porque `npm run db:types` sobrescribe el archivo entero. Con todo mezclado,
regenerar borra el código escrito a mano, así que en la práctica nadie
regenera y los tipos dejan de describir la base. `database.types.ts` es
generado y `domain.ts` deriva de él: regenerar es seguro, y por eso se hace.

**¿Por qué el diseño se define solo con tokens?**
Todo el color, la tipografía, los radios y las curvas de animación viven en el
bloque `@theme` de `globals.css`. Ningún componente tiene un color escrito a
mano. Rebrandear una instalación nueva es editar ese bloque: sin eso, cada
cliente nuevo obligaría a repasar cincuenta archivos.

**¿Por qué Framer Motion si el resto es CSS?**
Las animaciones de estado —aparecer y desaparecer, reordenarse, deslizarse
entre elementos— no se pueden hacer con CSS solo, porque necesitan que el
elemento siga montado mientras sale. `AnimatePresence` y `layoutId` resuelven
exactamente eso: el indicador de la sección activa se desliza entre ítems del
menú y el círculo del día elegido viaja de un día a otro. Todo lo que sí puede
hacerse con CSS —hovers, transiciones, esqueletos— se hace con CSS y no paga
JavaScript.

**¿Por qué RLS y no solo validar en la aplicación?**
Porque la clave pública viaja al navegador. Cualquiera puede abrir la consola y
llamar a la API de Supabase directamente. RLS es la única capa que no se puede
saltear: si la policy dice que un cliente ve solo sus turnos, no hay request
que devuelva otro.

**¿Por qué RPC para reservar, cancelar y reprogramar?**
Porque son operaciones con reglas que deben evaluarse **atómicamente**. Entre
"verifiqué que el horario está libre" y "lo inserto" hay milisegundos
suficientes para que otro lo tome. Un RPC `SECURITY DEFINER` valida e inserta
en la misma transacción, y el constraint de exclusión cierra la carrera.

**¿Por qué Server Actions y no Route Handlers?**
Porque las escrituras están atadas a un formulario y no necesitan URL propia ni
caché HTTP. Se llaman con el tipado del proyecto, sin serializar a mano ni
mantener contratos JSON. Los Route Handlers quedan para lo que sí necesita una
URL: el callback de auth y el cron.

**¿Por qué middleware si igual hay RLS?**
Por experiencia de usuario y por defensa en profundidad. Sin middleware, un
usuario común entraría a `/admin`, vería el panel renderizarse y recibiría
tablas vacías. Con middleware, lo redirige antes de renderizar nada.

**¿Por qué snapshots de precio en cada turno?**
Porque el historial no puede cambiar retroactivamente. Si el servicio sube de
precio, los turnos ya reservados conservan lo que se le informó al cliente.

**¿Por qué las observaciones privadas están en otra tabla?**
Porque RLS filtra **filas, no columnas**. Si fueran una columna de `clients`, la
policy que deja al cliente ver su propia ficha se las mostraría.

**¿Por qué el vencimiento de la seña?**
Porque no hay pasarela de pago. Sin vencimiento, un turno pendiente que nadie
señó bloquea ese horario para siempre y la agenda se llena de fantasmas en dos
semanas.

**¿Por qué cada función lleva su `GRANT` explícito?**
Porque la migración 02 revoca todos los permisos por defecto y los devuelve uno
por uno. Es más trabajo, pero deja el permiso escrito y auditable en un solo
lugar en vez de depender de lo que PostgreSQL otorga automáticamente. El costo
de ese enfoque es que **olvidar una función se paga con un error en
ejecución**, y eso fue exactamente lo que pasó con `is_terminal_status()`
(sección 11.3). El diagnóstico ahora incluye una sonda para que no vuelva a
detectarse sobre un turno real.

**¿Por qué los errores se lanzan en vez de devolver vacío?**
Porque un dashboard en cero por un fallo de base es peor que una pantalla que
dice qué se rompió. Durante la primera instalación, un `catch` que devolvía
ceros ocultó que faltaba una función entera.

---

## 9. Estado de las funcionalidades

### Autenticación
- ✅ Registro con nombre y teléfono
- ✅ Inicio y cierre de sesión
- ✅ Confirmación por email
- ✅ Roles y promoción a administrador (por SQL)
- ✅ Protección de rutas por middleware
- ✅ Cambio de contraseña desde el perfil
- 🚧 Recuperación de contraseña por email (olvido)
- 🚧 ABM de administradores desde el panel

### Sitio público
- ✅ Inicio con disponibilidad real
- ✅ Catálogo de servicios
- ✅ Contacto con días de atención
- ✅ Flujo de reserva completo con seña
- ✅ Mi cuenta: próximos turnos, historial, cancelar, reprogramar, editar datos

### Panel
- ✅ Dashboard con métricas
- ✅ Calendario día / semana / mes
- ✅ Turnos con filtros, buscador, cambio de estado y reprogramación
- ✅ Clientes con ficha, historial y observaciones privadas
- ✅ Servicios: alta, edición, activación, orden
- ✅ Horarios, bloqueos, feriados y vacaciones
- ✅ Configuración del negocio, seña, zona horaria y políticas
- ✅ Notificaciones: recordatorios, segundo recordatorio y plantillas de mensajes
- ✅ Diagnóstico de instalación, permisos y duraciones
- ⚠ Observaciones internas por turno (la tabla lo soporta, falta la interfaz)
- ⚠ Subida de imágenes de servicios (pendiente decidir si sale del panel)

### Infraestructura
- ✅ Migraciones reproducibles
- ✅ RLS en las 11 tablas
- ✅ Logging estructurado
- ✅ Límites de error y estados de carga
- ⚠ Recordatorios: se encolan correctamente, falta el canal de envío
- 🚧 Cron de mantenimiento configurado en producción

---

## 10. Pendientes y roadmap

### Prioridad alta
1. **Recuperación de contraseña.** Hoy un cliente que la olvida no puede entrar.
2. **ABM de administradores.** Que promover a alguien no exija el SQL Editor.
3. **Canal de recordatorios.** La cola, los tiempos y los textos están; falta
   el envío automático. Hoy se mandan desde los enlaces de WhatsApp de cada
   turno.
4. **Cron en producción.** Sin él, las reservas sin seña no vencen nunca.

### Prioridad media
5. Observaciones internas por turno.
6. Paginación en turnos y clientes (hoy el tope es 100).
7. Notificación al negocio cuando entra una reserva.
8. Exportación a Excel de turnos y clientes.

### Prioridad baja
9. Sincronización con Google Calendar / calendario de iOS.
10. Pagos en línea de la seña.
11. Notificaciones push.
12. Métricas de facturación por período.

### Roadmap sugerido

**Etapa 1 — Operación autónoma.** Puntos 1 a 4. El objetivo es que el negocio
no dependa de vos para el día a día, y que ninguna tarea corriente exija abrir
Supabase.

**Etapa 2 — Escala.** Puntos 5 a 7. Recién tienen sentido cuando hay volumen
real: paginar 40 turnos es trabajo perdido.

**Etapa 3 — Producto.** Del 8 en adelante, guiados por lo que pidan los
primeros clientes reales y no por lo que parezca prolijo.

### Checklist de tareas

```
☐ Recuperación de contraseña
☐ ABM de administradores en el panel
☐ Conectar el envío automático de WhatsApp o email
☐ Foto de perfil (hoy el avatar son iniciales)
☐ Configurar el cron de mantenimiento en producción
☐ Observaciones internas por turno
☐ Paginación en listados
☐ Aviso al negocio ante reserva nueva
☐ Exportación a Excel
☐ Agenda de Google
☐ Calendario de iOS
☐ Pagos en línea
☐ Notificaciones push
```

---

## 11. Problemas conocidos y errores frecuentes

### 11.1 Problemas resueltos en la migración 07

Aparecieron durante la primera instalación y **ya están corregidos**. Se
documentan porque explican por qué existe esa migración.

| Problema | Causa real | Solución aplicada |
|---|---|---|
| `column "status" is of type reminder_status but expression is of type text` | Un `CASE` con dos literales resuelve a `text`, y `text → enum` no tiene conversión implícita. Un literal suelto sí se convierte | El estado se resuelve en una variable ya tipada como `reminder_status` |
| `missing FROM-clause entry for table "public"` | Dentro de `ON CONFLICT DO UPDATE` la tabla destino se referencia sin esquema | `appointment_reminders.status` en vez de `public.appointment_reminders.status` |
| `permission denied for function is_admin` | La policy de servicios evaluaba `is_admin()` también para visitantes anónimos, que no tenían el `GRANT`. PostgreSQL no garantiza cortocircuitar el `OR` | Dos policies separadas por audiencia y `GRANT` explícito a `anon` |
| Dashboard en ceros con `[getDashboardStats] {}` | `admin_dashboard_stats()` no existía —la migración 06 no se había aplicado— y el `catch` devolvía ceros sin avisar | La función se recrea en la 07 y el servicio ahora lanza el error |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` no coincide con lo que entrega Supabase | Supabase renombró las claves a `publishable` / `secret` | `env.ts` acepta las dos nomenclaturas |
| `npm run build` fallaba en los links dinámicos | `experimental.typedRoutes` tipa `href` como unión de rutas literales | Desactivado, con la explicación en `next.config.ts` |

### 11.3 `permission denied for function is_terminal_status`

**Síntoma:** todo el panel funciona, pero cambiar el estado de un turno falla.

**Causa exacta.** La migración 02 revoca `EXECUTE` sobre todas las funciones
del esquema y después otorga permisos función por función.
`is_terminal_status()` quedó fuera de esa lista.

**Por qué recién apareció ahora.** PostgreSQL verifica los permisos de forma
distinta según cómo se llame a la función:

- En un **trigger**, el permiso se comprueba al **crear** el trigger, no al
  dispararlo. Por eso los 9 triggers del sistema funcionan sin ningún `GRANT`.
- Dentro del **cuerpo de una función**, se comprueba en **cada ejecución**, con
  el rol que esté corriendo en ese momento.

`appointments_guard_transition()` —el trigger que impide que un turno vuelva
desde un estado terminal— es `SECURITY INVOKER`: corre como `authenticated` y
en su cuerpo llama a `is_terminal_status()`. Es el único lugar del sistema
donde una función invocadora llama a otra función del esquema, y por eso el
único camino que falla.

`cancel_appointment()` también la llama, pero es `SECURITY DEFINER` y corre
como el dueño de la función, que sí tiene permiso. De ahí que cancelar desde
"Mi cuenta" funcione y cambiar el estado desde el panel no.

**Solución aplicada** (`20260730140000_permissions.sql`):

```sql
grant execute on function public.is_terminal_status(public.appointment_status)
  to authenticated, service_role;
```

**Por qué el `GRANT` y no `SECURITY DEFINER`.**
`is_terminal_status(appointment_status)` es `IMMUTABLE`, recibe un enum y
devuelve un booleano: no consulta ninguna tabla, no lee una sola fila y no
puede filtrar información. Otorgar `EXECUTE` no expone absolutamente nada.
Marcar el trigger como `SECURITY DEFINER` sí sería un riesgo real: le daría
privilegios de dueño a una función que procesa datos enviados por el usuario,
y esos privilegios se arrastrarían a todo lo que la función haga en el futuro.
No se desactivó RLS ni se tocó ninguna policy.

**Prevención.** La misma migración agrega `check_status_guard()`, una función
`SECURITY INVOKER` que solo ejerce ese permiso, y `/admin/diagnostico` la
ejecuta. Si el `GRANT` vuelve a faltar, se detecta ahí y no sobre un turno
real.

### 11.6 `Property 'X' does not exist on type 'never'` en el build

**Síntoma:** el build de Vercel falla con `Property 'timezone' does not exist
on type 'never'`. En desarrollo no aparece, porque `next dev` no hace
verificación completa de tipos.

**Causa raíz.** `database.types.ts` estaba escrito a mano y contenía
construcciones que el generador nunca emite:

| Escrito a mano | Lo que emite el generador |
|---|---|
| `Insert: never` | un objeto con las columnas |
| `Views: Record<never, never>` | `{ [_ in never]: never }` |
| `Args: Record<string, never>` | `Args: Record<PropertyKey, never>` |

`supabase-js` resuelve el tipo de cada consulta con tipos condicionales sobre
`Database`. Si una tabla declara `Insert: never`, ese tipo **no es asignable**
a la forma que el cliente espera, la condición no encaja y toda la rama
colapsa a `never`. Por eso el error aparecía en `settings.timezone` aunque el
problema estuviera en la definición de la tabla: `maybeSingle()` devolvía
`never` y cualquier propiedad sobre `never` es un error.

Que fallara solo en Vercel es coherente: `next build` corre `tsc` sobre todo
el proyecto, `next dev` no.

**Por qué el archivo se editaba a mano.** Porque mezclaba dos cosas: los tipos
generados y los tipos propios del dominio (`AppointmentStatus`,
`DashboardStats`, `Tables<>`). Con todo en un archivo, `npm run db:types` los
borraba. La consecuencia práctica fue que nadie regeneraba nunca, y los tipos
dejaron de describir la base. Ese mismo desfasaje causó el error de plantillas
de la sección 11.5.

**Solución aplicada.**

1. **`database.types.ts`** se reescribió en el formato exacto del generador y
   quedó marcado como archivo generado. Solo exporta `Database` y `Json`.
2. **`src/types/domain.ts`** es nuevo y contiene todo lo escrito a mano,
   **derivado** del generado:

   ```ts
   export type AppointmentStatus = Enums<'appointment_status'>
   export type ClientSummary =
     Database['public']['Functions']['admin_list_clients']['Returns'][number]
   ```

   Regenerar ya no borra nada y los tipos del dominio se actualizan solos con
   el esquema.
3. **Las 17 importaciones** de tipos del dominio pasaron a `@/types/domain`.
   Los cuatro clientes de Supabase siguen importando `Database` del archivo
   generado: es su contrato directo con la base.
4. **Se eliminaron los `as unknown as`** de los listados de turnos. Con los
   tipos correctos, `supabase-js` infiere los joins solo; lo único que faltaba
   era declarar los `select` como literales constantes (`as const`), porque
   una cadena armada dinámicamente se tipa como `string` y rompe la
   inferencia.
5. **`npm run check:types`** detecta las construcciones que delatan edición
   manual y explica por qué cada una rompe la inferencia.

**Sobre `admin_dashboard_stats`.** Devuelve `json`, y PostgreSQL no puede
describir la forma de ese objeto: para el generador es `Json`. Su estructura
se verifica ahora en tiempo de ejecución en `getDashboardStats()`, con un
mensaje que nombra la clave faltante, en lugar de afirmarla con un `as` que
TypeScript aceptaría sin comprobar nada.

**Segunda causa del mismo síntoma: la versión de la librería.**
`@supabase/supabase-js` cambió su sistema de tipos entre versiones menores. A
partir de la 2.49 el tipo `Database` necesita otra forma, y el archivo de
tipos —hecho para una— deja de encajar con la otra. El síntoma es
inconfundible en el mensaje de error:

```
PostgrestTransformBuilder<{ PostgrestVersion: "12"; }, never, never, ...>
                            └── existe solo en las versiones nuevas
```

Con `never` en la posición del esquema, **toda** consulta del proyecto falla:
`.update()` recibe `never`, `.rpc()` recibe `undefined`, cada columna
"no existe". Cincuenta errores repartidos en dieciocho archivos, ninguno
señalando la causa.

Un rango abierto (`^2.45.4`) deja que npm elija. Por eso las dos dependencias
de Supabase están **fijadas en versiones exactas** y `npm run check:deps`
confirma que lo instalado sea lo declarado.

Si querés actualizar Supabase, actualizá también los tipos:

```bash
npm install @supabase/supabase-js@latest @supabase/ssr@latest
npm run db:types     # los regenera en el formato que espera la versión nueva
npm run verify
```

**Tercera causa del mismo síntoma: `select()` sin literal.**
`supabase-js` deduce la forma de cada respuesta analizando el **texto** del
select en tiempo de compilación. Necesita un literal:

```ts
.select('id, timezone')                    // ✅ el parser lo resuelve
.select(columnas.map(c => c.n).join(','))  // ❌ es `string`: no puede
```

Con un `string` genérico el parser devuelve un tipo de error, y eso produce
cascadas de `does not exist on type 'never'` en archivos que a simple vista
están bien. Le pasó a `/admin/diagnostico`, que armaba su select con
`.map().join()`: nueve errores en un archivo por una sola línea.

Si un select tiene que variar, se declara una constante por cada forma con
`as const` —como hace `listAppointments()` con y sin búsqueda—, nunca se
construye la cadena. `npm run check:queries` detecta las violaciones.

**Prevención.** Después de cada `npm run db:push`, corré `npm run db:types`.
Los tipos son un contrato con la base: si se escriben a mano, mienten, y
TypeScript no tiene forma de saberlo.

### 11.5 `Cannot read properties of undefined (reading 'replace')`

**Síntoma:** las pantallas de Turnos y Notificaciones rompen en
`renderTemplate()`, y el límite de error muestra `{}`.

**Causa raíz.** No estaba en `renderTemplate()`. La aplicación leía seis
columnas de `business_settings` que solo existen después de la migración 10.
Con la migración sin aplicar, `select('*')` devuelve la fila **sin esas
claves**, y `settings.message_reminder` vale `undefined`.

Lo que impidió detectarlo antes es que `database.types.ts` está escrito a mano
y declara esas columnas como `string` obligatorio. **El tipo mentía sobre la
base**: TypeScript compilaba sin una sola advertencia y el error aparecía en
tiempo de ejecución, tres capas más abajo de su causa.

Había además un segundo agujero, independiente de las migraciones: la
migración 10 creó las columnas con `default ''` y cargó los textos con un
`UPDATE`. Ese `UPDATE` corre una sola vez. Cualquier fila creada después
—una instalación nueva, una fila recreada— nacía con las plantillas vacías, y
un texto vacío produce un mensaje en blanco.

**Solución aplicada.** Cuatro cambios en capas distintas, ninguno un `?? ''`
suelto:

1. **`20260731120000_message_defaults.sql`** mueve los textos al `DEFAULT` de
   cada columna, que es donde corresponde: cualquier fila nace con mensajes
   utilizables sin que nadie los cargue. Rellena además las que quedaron
   vacías, sin pisar lo que haya escrito el negocio.
2. **`normalizeSettings()`** en `lib/services/settings.ts` compara lo que
   devuelve la base contra las columnas que el código necesita. Si falta
   alguna, completa con el valor por defecto **y registra en el log el nombre
   de la columna y la migración que la agrega**. La pantalla sigue
   funcionando; el problema queda visible en vez de convertirse en un
   `TypeError`.
3. **`renderTemplate()`** acepta `string | null | undefined`. No es la
   garantía —de eso se encarga el punto 2— sino la última red: una función de
   formateo de texto no debería poder tumbar una pantalla entera, y menos
   cuando la llama un componente cliente que no puede recuperarse.
4. **`/admin/diagnostico`** pide las ocho columnas **por nombre** en lugar de
   `select('*')`. Así PostgREST responde `PGRST204` con la columna exacta que
   falta, y el diagnóstico dice qué migración aplicar. También avisa si alguna
   plantilla quedó vacía en la base.

Los textos por defecto viven en `src/lib/notifications/defaults.ts` y en la
migración 11. Es la única duplicación aceptada del proyecto: la alternativa
—que la aplicación dependa de que la base esté al día— es exactamente lo que
provocó el error.

**Sobre el `{}` del límite de error.** Era el mismo problema de logging ya
corregido en `utils/log.ts`, que había quedado sin corregir en los dos
`error.tsx`. El overlay de Next muestra un objeto suelto como `{}`. Ahora los
dos registran primero una línea de texto legible.

### 11.4 "La agenda no bloquea la duración del servicio"

La disponibilidad **siempre** se calcula con la duración real. Un candidato se
descarta si su bloque `[inicio, inicio + duración + buffer)` se superpone con
el rango `[starts_at, ends_at)` de algún turno activo. Con un servicio de 2
horas e intervalos de 30 minutos, reservar las 13:00 descarta 13:30, 14:00 y
14:30, y el próximo horario ofrecido es 15:00. El cálculo está en
`get_available_slots()`, en la base, y el constraint de exclusión lo respalda:
aunque alguien llame al RPC a mano, la base rechaza el segundo turno solapado.

Si viste horarios que deberían estar bloqueados, hay dos causas posibles:

1. **La duración del servicio cambió después de reservar.** Cada turno guarda
   la duración con la que fue reservado. Si el servicio pasó de 30 a 120
   minutos, los turnos anteriores siguen bloqueando 30 minutos. Es correcto
   —el historial no cambia retroactivamente— pero se ve como un error.
   `/admin/diagnostico` lista esos turnos.
2. **`ends_at` quedó mal calculado** en turnos creados mientras el trigger
   `appointments_compute_end` no existía, algo posible en una instalación con
   migraciones aplicadas a mano. La migración 08 los recalcula.

### 11.2 Errores frecuentes

**`Invalid API key`**
Supabase rechazó la clave. Corré `npm run check:env`: valida el formato y hace
una consulta real al proyecto, así se separa "la clave está mal escrita" de "la
clave no es de este proyecto". Las causas, en orden de frecuencia:

1. La clave es de otro proyecto distinto al de la URL.
2. Se cortó al copiar. Los JWT del formato anterior son larguísimos.
3. El proyecto tiene deshabilitado ese tipo de clave. En Project Settings →
   API Keys, los proyectos recientes vienen con las claves antiguas (`anon`,
   `service_role`) desactivadas: hay que usar `sb_publishable_…`.
4. Quedó con comillas, espacios o un salto de línea en `.env.local`.
5. Editaste `.env.local` sin reiniciar `npm run dev`. Next lee las variables
   solo al arrancar.

**`Failed to collect page data for /_not-found`** (build de Vercel)
Un módulo lanzó **al importarse**, no al renderizarse. Next construye
`/_not-found` importando el layout raíz, así que cualquier excepción en la
cadena de imports mata el build con este mensaje, que no menciona la causa.

El caso típico es código en el nivel superior de un archivo —fuera de toda
función— que puede fallar: validaciones de entorno, lecturas de `process.env`,
clientes creados como constante del módulo.

Por eso `src/lib/env.ts` valida de forma **perezosa**, con getters: la
comprobación ocurre cuando alguien lee el valor, no al importar. Una variable
ausente se manifiesta al crear el cliente de Supabase, con un mensaje que la
nombra, en lugar de tumbar la compilación.

Si escribís un módulo nuevo, mantené esa regla: **importar no debe poder
fallar.**

**`TypeError: Failed to fetch`**
No es un error de la aplicación: es el navegador informando que una petición
murió sin respuesta HTTP. **El error real está en la terminal donde corre
`npm run dev`.** Causas habituales: el Server Component lanzó una excepción no
capturada, el servidor se reinició por un cambio de código mientras enviabas el
formulario, o el proceso se cayó. Empezá por `/admin/diagnostico`.

**`PGRST202` — la función no existe**
Faltan migraciones o la firma cambió. Ejecutá `supabase/verificacion.sql`: el
bloque 1 compara la firma exacta de las 13 funciones.

**`PGRST204` — la columna no existe**
Los tipos están desactualizados respecto de la base. `npm run db:types`.

**`42501` — permiso denegado**
Falta un `GRANT` o una policy bloquea la operación. El bloque 3 de
`verificacion.sql` muestra quién puede ejecutar cada función.

**El formulario dice "guardado" pero no cambió nada**
Una policy bloqueó el `UPDATE` sin devolver error: PostgREST informa cero filas
afectadas. Por eso las escrituras críticas terminan en `.select()` y verifican
que haya vuelto una fila. Si te pasa en una escritura nueva, agregá esa
verificación.

**No puedo entrar después de registrarme**
La confirmación por email está activada y no confirmaste. Revisá spam, o
desactivala en Authentication → Providers → Email mientras desarrollás.

**El link de confirmación da error**
Falta `/auth/callback` en Redirect URLs, o `NEXT_PUBLIC_SITE_URL` no coincide
con el dominio desde el que entraste.

**Soy administrador pero `/admin` me rebota**
El rol se lee de la sesión activa. Cerrá sesión y volvé a entrar después de
ejecutar `promote_to_admin`.

**El calendario no deja elegir ningún día**
No hay franjas en `business_hours` para esos días, la anticipación mínima tapa
todos los horarios, o el servicio está inactivo. `/admin/diagnostico` muestra
cuántos horarios devuelve el motor para mañana.

**Los horarios aparecen corridos**
La zona horaria del negocio no es la correcta. Se cambia en
`/admin/configuracion`.

**Un servicio no se deja eliminar**
Tiene turnos asociados y la clave foránea lo impide: borrarlo dejaría historial
huérfano. Desactivalo.

**Al agregar una franja dice que se superpone**
Ya existe otra franja activa ese día que pisa el rango nuevo.

---

## 12. Mantenimiento: cómo extender el sistema

### Agregar un servicio nuevo
Desde `/admin/servicios`. No requiere tocar código.

### Agregar un estado de turno nuevo
1. Migración nueva: `alter type public.appointment_status add value 'nuevo_estado';`
2. `src/types/database.types.ts` → agregarlo al tipo `AppointmentStatus`.
3. `src/lib/constants.ts` → etiqueta, color y si es terminal.

No hay que tocar ningún componente: la tabla, el calendario y los filtros se
construyen a partir de `APPOINTMENT_STATUS`.

> Los valores de un enum no se pueden eliminar en PostgreSQL, y agregarlos no
> corre dentro de una transacción junto con otras operaciones. Poné el
> `add value` en su propia migración.

### Agregar un rol nuevo
1. `alter type public.user_role add value 'recepcion';`
2. Función `is_recepcion()` con el mismo patrón `SECURITY DEFINER` de
   `is_admin()`, más su `GRANT`.
3. Policies que la usen.
4. Middleware y guard.

Nunca guardes el rol en `user_metadata`.

### Agregar un campo a la configuración
1. Migración: `alter table public.business_settings add column if not exists …`
2. `database.types.ts` → agregarlo a `Row`.
3. `lib/validations/admin.ts` → al `settingsSchema`.
4. `lib/actions/admin/settings.ts` → al `update`.
5. `components/admin/SettingsForm.tsx` → el campo.

Los cinco pasos, siempre en ese orden. Saltearse el 2 hace que TypeScript no
avise si el 4 tiene un error de tipeo.

### Agregar un módulo nuevo al panel
1. Lectura en `lib/services/admin/`, que lanza `DataError` ante fallo.
2. Escritura en `lib/actions/admin/`, con Zod y `toUserMessage`.
3. Página en `app/admin/<modulo>/`.
4. Entrada en `LINKS` de `AdminNav`.
5. Prueba en `/admin/diagnostico` si depende de un objeto nuevo de la base.

### Personalizar el sistema para un cliente nuevo
1. Proyecto de Supabase nuevo y las 11 migraciones.
2. `globals.css` → paleta y tipografías.
3. `layout.tsx` → fuentes y metadatos.
4. `public/` → logo y favicon.
5. Deploy, variables de entorno, primer administrador y carga inicial (4.6).

---

## 13. Checklists de deploy y pruebas

### Deploy

```
☐ Proyecto de Supabase creado en la región correcta
☐ npm run check:deps en verde (versiones exactas instaladas)
☐ Las 11 migraciones aplicadas sin errores
☐ verificacion.sql sin filas en ❌
☐ Site URL y Redirect URLs con el dominio de producción
☐ Variables de entorno cargadas en el hosting
☐ NEXT_PUBLIC_SITE_URL con el dominio real, sin barra final
☐ npm run check:env en verde
☐ npm run verify en verde (incluye tipos, consultas y build)
☐ Primer administrador promovido
☐ Configuración, horarios y servicios cargados
☐ /admin/diagnostico en verde en producción
☐ Cron de mantenimiento configurado cada 15 minutos
☐ Confirmación por email activada
```

**Cron.** Con Vercel, `vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/mantenimiento", "schedule": "*/15 * * * *" }] }
```

Con pg_cron de Supabase:

```sql
select cron.schedule(
  'mantenimiento-turnos',
  '*/15 * * * *',
  $$ select public.expire_pending_appointments(); $$
);
```

### Pruebas funcionales

```
Sitio público
☐ La portada carga SIN sesión iniciada (ventana de incógnito)
☐ El catálogo muestra solo servicios activos
☐ El calendario apaga los días sin horarios
☐ El modal de seña muestra el monto correcto según el porcentaje

Reserva
☐ Reservar un turno de punta a punta
☐ El turno aparece en Mi cuenta como pendiente de confirmación
☐ Aparece en el calendario del panel
☐ Se creó la fila en appointment_reminders
☐ Dos navegadores reservando el mismo horario: el segundo recibe el aviso, no un error 500

Cliente
☐ Cancelar dentro del plazo permitido
☐ Cancelar fuera de plazo: se rechaza con el mensaje correcto
☐ Reprogramar: el turno viejo queda "reprogramado" y libera el horario
☐ Editar nombre y teléfono

Panel
☐ Dashboard con números reales
☐ Calendario en las tres vistas
☐ Filtrar turnos por estado, servicio y fechas
☐ Buscar por nombre, teléfono y email
☐ Cambiar estado y mover un turno
☐ Mover a un horario ocupado: se rechaza
☐ Crear, editar, desactivar y eliminar un servicio
☐ Eliminar un servicio con turnos: se rechaza con el mensaje correcto
☐ Agregar y eliminar franjas horarias
☐ Franja superpuesta: se rechaza
☐ Crear un bloqueo y verificar que desaparece del calendario público
☐ Guardar configuración y ver el cambio reflejado en el sitio
☐ Observaciones privadas: verificar que el cliente NO las ve

Seguridad
☐ Un usuario común entrando a /admin es redirigido
☐ Un usuario común no ve turnos de otro cliente
☐ Sin sesión, /mi-cuenta y /reservar redirigen a ingresar
```

---

## 14. Changelog

### 2026-07-31 · Panel en celular

**Navegación**
- Barra inferior fija con los cuatro accesos diarios y una hoja "Más" para las
  pantallas de configuración. La columna lateral queda solo en escritorio.
- Barra superior de celular con el nombre de la pantalla actual: con la
  navegación abajo, arriba solo hace falta decir dónde estás.
- El contenido reserva `pb-24` para no quedar tapado, y la barra respeta
  `env(safe-area-inset-bottom)` del iPhone.

**Desbordes corregidos**
- `min-w-0` en el layout, el `main` y cada contenedor de listado. Sin él, un
  hijo de flex o grid se niega a encogerse y estira la página entera.
- El calendario mensual tiene `min-w-[640px]` a propósito, pero su contenedor
  no podía contener el scroll: le faltaba `min-w-0`.
- `min-w-52` en el diagnóstico y `w-40` en el ranking del dashboard no entran
  en 360px. Ahora son responsive o se apilan.
- Los campos de fecha y hora conservaban su ancho intrínseco en iOS.

**Adaptaciones**
- Métricas del dashboard y resumen del cliente: dos columnas en celular en vez
  de una, para no dejar la pantalla vacía.
- Filtros de turnos plegados en un `<details>`, abierto si hay filtros activos.
- Acciones de cada turno y de cada servicio a ancho completo en celular.
- Botones de guardar fijos sobre la barra de navegación, no debajo.
- Vista semanal del calendario: dos columnas en celular, tres en tablet.

**Agregado**
- `npm run check:responsive`: detecta anchos fijos sin variante responsive y
  `overflow-x-auto` sin `min-w-0`, las dos causas del desborde horizontal.

### 2026-07-31 · El build de Vercel y los módulos que lanzan

**Corregido**
- `Failed to collect page data for /_not-found`. `src/lib/env.ts` validaba las
  variables en el nivel superior del módulo, así que lanzaba **al importarse**.
  Next importa el layout raíz para construir `/_not-found`, y cualquier
  excepción en esa cadena mata el build con un mensaje que no menciona la
  causa. La validación pasó a getters: ocurre en el primer acceso real.
- Las comprobaciones de forma de la URL y de la clave pasaron de `throw` a
  aviso. Un dominio propio o un formato de clave nuevo son legítimos y no
  deberían impedir que el proyecto arranque. La única que sigue deteniendo
  todo es la clave secreta cargada en una variable `NEXT_PUBLIC_`, que expone
  la base entera.
- `serviceImageUrl()` devuelve `null` sin entorno configurado en lugar de
  lanzar: una tarjeta sin foto es mejor que una página caída.
- `generateMetadata` ni siquiera intenta la consulta si faltan las variables,
  para no llenar el log del build de errores que no son del código.

### 2026-07-31 · Versiones de Supabase y errores en cascada

**Corregido**
- 56 errores de tipos en 18 archivos, con una sola causa: `^2.45.4` permitió
  que npm instalara `@supabase/supabase-js` 2.49+, cuyo sistema de tipos es
  incompatible con el formato del archivo de tipos. Las dos dependencias de
  Supabase quedaron fijadas en versiones exactas.
- `listAppointments()` aplicaba `.returns<T>()` **antes** de los filtros.
  Ese método devuelve un builder de transformación que ya no acepta `.eq()`,
  `.gte()` ni `.or()`. Ahora va al final de la cadena.
- El select de turnos usa siempre `client:clients!inner(...)`. No descarta
  filas —`client_id` es NOT NULL con clave foránea— y elimina la segunda
  variante del select, que obligaba a manejar una unión de tipos.
- `MessageField` mezclaba dos identificadores distintos en una sola prop: el
  nombre del campo del formulario (`messageConfirmation`, que lee Zod) y la
  columna de la base (`message_confirmation`, que indexa el texto por
  defecto). Ahora son dos props separadas.

**Agregado**
- `npm run check:deps`: confirma que las versiones instaladas de Supabase sean
  las declaradas y avisa si alguna quedó con rango abierto. Corre primero en
  `npm run verify`, porque explica el resto de los errores.

### 2026-07-31 · Tipos generados y build de producción

**Corregido**
- `Property 'timezone' does not exist on type 'never'` en el build. Causa raíz
  y solución completas en la sección 11.6.
- `database.types.ts` se reescribió en el formato del generador: las
  construcciones escritas a mano (`Insert: never`, `Views: Record<never,
  never>`, `Args: Record<string, never>`) rompían la inferencia de
  `supabase-js` y colapsaban todas las consultas a `never`.
- Se eliminaron los cuatro `as unknown as` de los listados de turnos: con los
  tipos correctos y los `select` como literales constantes, la inferencia de
  los joins funciona sola.

**Agregado**
- `src/types/domain.ts`: tipos propios derivados del esquema, separados del
  archivo generado para que regenerar no borre nada.
- `npm run check:queries`: detecta `select()` armados dinámicamente, que
  rompen la inferencia de supabase-js y generan errores `never` en cascada.
- `npm run verify`: corre la misma secuencia que Vercel —tipos, consultas y
  build— para no descubrir los errores recién en el deploy.
- `/admin/diagnostico` reescrito sin selects dinámicos: era la causa de nueve
  errores de tipos en ese archivo.
- `generateMetadata` del layout raíz ya no puede tumbar el build: si la base
  no responde durante la compilación, degrada a un título por defecto.
- `npm run check:types`: detecta señales de edición manual en el archivo
  generado y explica por qué cada una rompe la inferencia.
- `getDashboardStats()` verifica la forma del JSON en tiempo de ejecución, con
  el nombre de la clave faltante.

### 2026-07-31 · Plantillas ausentes en la configuración

**Corregido**
- `Cannot read properties of undefined (reading 'replace')` en Turnos y
  Notificaciones. Causa raíz y solución completas en la sección 11.5.
- Los textos por defecto pasaron a ser el `DEFAULT` de cada columna: una
  instalación nueva ya no puede quedar con plantillas vacías.
- Los dos `error.tsx` registraban un objeto suelto, que el overlay de Next
  muestra como `{}`.

**Agregado**
- `src/lib/notifications/defaults.ts`: textos por defecto del producto,
  compartidos por la aplicación y la migración 11.
- `normalizeSettings()`: detecta columnas ausentes, completa con los valores
  por defecto y registra qué migración falta aplicar.
- El diagnóstico verifica las ocho columnas de notificaciones por nombre e
  informa cuál falta y en qué migración está.

### 2026-07-31 · Rediseño completo de la experiencia

**Navegación**
- `src/lib/navigation.ts`: una sola función decide los ítems según rol y
  sesión. Antes lo decidían por separado el header de escritorio, el de
  celular y el pie, y por eso convivían "Panel" e "Ir al Panel". Ese botón
  desapareció.
- `/mi-cuenta` se dividió en dos: **`/mis-turnos`** (agenda del cliente) y
  **`/mi-cuenta`** (perfil de la persona, para los dos roles: avatar, nombre,
  email, rol, datos y cambio de contraseña). El middleware sigue bloqueando
  `/reservar` y `/mis-turnos` para el administrador, pero ya no el perfil.
- "Inicio" está siempre presente, en todas las pantallas.

**Sistema de diseño**
- Paleta nueva: base casi blanca cálida, arena, y rosa empolvado desaturado
  como único acento. Los estados de los turnos mantienen colores propios
  porque ahí el color es información.
- Tipografías: Cormorant Garamond para títulos, Plus Jakarta Sans para el
  cuerpo. Los números tabulares salen de la misma sans; se eliminó la familia
  monoespaciada.
- Sombras de dos capas muy abiertas (`shadow-soft`, `shadow-lifted`), radios
  de 20 px y utilidades de esqueleto.
- Los inputs no bajan de 16px: por debajo, iOS hace zoom y rompe la sensación
  de aplicación.

**Movimiento**
- Framer Motion para lo que CSS no puede: transición entre páginas
  (`template.tsx`), apertura y cierre de modales, menú de celular, indicador
  de sección activa con `layoutId`, cambio de mes del calendario y el
  interruptor de notificaciones.
- Esqueletos de carga en el sitio público, el panel y el selector de horarios.

**Componentes rediseñados**
- **Header**: alto de 64/80 px, fondo translúcido con desenfoque, avatar por
  iniciales con color derivado del nombre, y menú de celular que entra como
  hoja nativa.
- **Calendario de reserva**: días sin lugar atenuados en lugar de grises, día
  actual con punto, día elegido con círculo que se desliza, fines de semana
  diferenciados por el color de la etiqueta, meses que entran desde el lado
  hacia el que se navega.
- **Horarios**: pills en vez de botones cuadrados, con estados de disponible,
  seleccionado y sin lugar, y aparición escalonada.
- **Agenda del panel**: la vista diaria pasó de lista a agenda con altura
  proporcional a la duración real de cada turno, con la línea horaria a la
  izquierda. Un servicio de dos horas se ve como el doble de uno de una.

**Notificaciones**
- Pantalla nueva `/admin/notificaciones` con interruptores animados y **vista
  previa en vivo** de cada mensaje mientras se escribe.
- Segundo recordatorio configurable (por ejemplo, 2 horas antes) además del
  de 24 horas, con su propio valor de enum en una migración aparte.
- Cuatro plantillas editables: confirmación, recordatorio, cancelación y
  cambio de estado, con variables entre llaves (`{cliente}`, `{servicio}`,
  `{fecha}`, `{hora}`, `{negocio}`, `{precio}`, `{senia}`, `{alias}`,
  `{estado}`).
- El renderizado vive en `src/utils/templates.ts`, no en SQL: el mismo texto
  sirve para WhatsApp hoy y para email mañana sin tocar la base.
- Cada turno del panel tiene sus enlaces de WhatsApp con el mensaje ya
  escrito, según el estado.
- Guardar la configuración **reencola** los turnos futuros: cambiar "24 horas
  antes" por "6 horas antes" ahora afecta también a los turnos ya reservados.

**Sin cambios funcionales**
Autenticación, roles, RLS, permisos, RPC, middleware, reservas, disponibilidad
y panel siguen funcionando exactamente igual. El rediseño no tocó una sola
regla de negocio.

### 2026-07-30 · Ajustes de experiencia y permisos

**Corregido**
- `permission denied for function is_terminal_status` al cambiar el estado de
  un turno. Causa, análisis y solución completos en la sección 11.3.
- Recálculo de `ends_at` en turnos futuros desalineados, para que cada turno
  bloquee exactamente la duración que ocupa (sección 11.4).

**Cambiado**
- **Modal de servicios**: altura máxima de 88 dvh (85 en desktop) con scroll
  interno. El título queda fijo arriba y los botones abajo, así que
  "Guardar servicio" nunca queda fuera de la pantalla en notebooks. El fondo
  sigue bloqueado y `overscroll-contain` evita que el scroll se escape a la
  página. Aplica a todos los modales del sistema.
- **Experiencia del administrador**: el administrador no reserva turnos. Su
  navegación se reduce a Inicio y Panel; desaparecen "Reservar", "Mi cuenta"
  y el botón de reserva de las tarjetas de servicio, el footer y contacto. El
  middleware redirige `/reservar` y `/mi-cuenta` al panel, de modo que no
  alcanza con escribir la URL. Un cliente común no ve ningún cambio.
- **Placeholders**: se quitaron los de ejemplo en nombre, email, teléfono y
  contraseña, donde la etiqueta ya dice todo. Se mantienen los que explican
  qué escribir o qué abarca una búsqueda ("Nombre, teléfono o email").

**Agregado**
- `check_status_guard()`: sonda que reproduce el camino del error de permisos,
  ejecutada desde `/admin/diagnostico`.
- `admin_appointments_duration_drift()`: lista los turnos futuros cuya
  duración difiere de la que hoy tiene su servicio.
- El diagnóstico muestra los horarios concretos que devuelve el motor para
  mañana, para verificar el bloqueo por duración a simple vista.

### 2026-07-30 · Auditoría técnica y correcciones

**Corregido**
- `appointments_sync_reminder()`: cast del enum `reminder_status` y referencia
  válida en `ON CONFLICT DO UPDATE`. Era la causa del error al crear o mover
  cualquier turno.
- `mark_reminder_sent()`: mismo cast.
- Policy `services_select_active` dividida en dos por audiencia y `GRANT` de
  `is_admin()` a `anon`. El sitio público fallaba para visitantes sin sesión.
- `admin_dashboard_stats()` y `admin_list_clients()` recreadas: la verificación
  mostró que no estaban en la base.
- Permisos de ejecución declarados función por función, en un solo lugar.
- `env.ts` acepta `PUBLISHABLE`/`SECRET` y `ANON`/`SERVICE_ROLE`.
- `typedRoutes` desactivado: rompía el build en los links dinámicos.
- `next.config.ts` ya no lanza al cargarse sin variables de entorno.

**Agregado**
- `npm run check:env`: valida `.env.local` y prueba la conexión real contra
  Supabase antes de levantar el proyecto.
- `env.ts` verifica el formato de la URL y de la clave, limpia comillas y
  espacios, y **detiene el arranque** si una clave secreta quedó en una
  variable `NEXT_PUBLIC_`.
- `utils/log.ts`: logging estructurado con `code`, `details`, `hint`, `stack` y
  explicación del código de error. Reemplaza todos los `console.error`.
- `DataError`: los servicios lanzan en vez de devolver vacío.
- `/admin/diagnostico`: pruebas en caliente con la sesión y los permisos reales
  de la aplicación, incluida la escritura de configuración.
- `supabase/verificacion.sql`: verificación desde la base.
- Límites de error (`error.tsx`), esqueleto de carga y página 404.
- Configuración: zona horaria editable, política de cancelación e interruptor
  de recordatorios.
- Verificación de filas afectadas al guardar la configuración: una policy que
  bloquea un `UPDATE` ya no puede pasar por un guardado exitoso.

**Pendiente**
- Recuperación de contraseña y ABM de administradores.
- Canal de envío de recordatorios.
- Decidir si la subida de imágenes de servicios sale del panel.

### 2026-07-29 · Construcción inicial
- Bloque 1: esquema, RLS, RPC, autenticación.
- Bloque 2: capa de servicios, motor de disponibilidad, flujo de reserva.
- Bloque 3: sitio público y Mi cuenta.
- Bloque 4: panel de administración completo.
