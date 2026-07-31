-- ===========================================================================
-- 11 · Textos por defecto de los mensajes
-- ===========================================================================
-- La migración 10 creó las columnas con DEFAULT '' y cargó los textos con un
-- UPDATE sobre la fila existente. Eso dejó dos huecos:
--
--   1. Una instalación nueva crea la fila de business_settings en la
--      migración 01, mucho antes de que existan estas columnas. Al agregarse
--      con DEFAULT '', la fila queda con las plantillas vacías y nadie las
--      completa: el UPDATE de la 10 corre una sola vez, en el orden correcto,
--      pero cualquier fila creada después vuelve a nacer vacía.
--   2. Un texto vacío no es un mensaje: al renderizarlo se obtiene una cadena
--      sin contenido y el botón de WhatsApp abre un chat en blanco.
--
-- La corrección mueve los textos al DEFAULT de la columna, que es donde
-- corresponde: así cualquier fila —hoy o dentro de un año— nace con mensajes
-- utilizables, sin depender de que alguien los cargue a mano.
--
-- Los mismos textos están en `src/lib/notifications/defaults.ts` como red de
-- seguridad de la aplicación. Si se cambia uno, hay que cambiarlo en ambos.
-- ===========================================================================

alter table public.business_settings
  alter column message_confirmation set default
    '¡Hola {cliente}! Confirmamos tu turno de {servicio} para el {fecha} a las {hora}. Te esperamos en {negocio}.',
  alter column message_reminder set default
    '¡Hola {cliente}! Te recordamos tu turno de {servicio} el {fecha} a las {hora}. Si no podés venir, avisanos así liberamos el lugar.',
  alter column message_cancellation set default
    'Hola {cliente}, cancelamos tu turno de {servicio} del {fecha} a las {hora}. Escribinos cuando quieras y coordinamos uno nuevo.',
  alter column message_status_change set default
    'Hola {cliente}, tu turno de {servicio} del {fecha} a las {hora} pasó a: {estado}.';

-- Relleno de lo que haya quedado vacío. Solo toca los campos en blanco: nunca
-- pisa un texto escrito por el negocio.
update public.business_settings set
  message_confirmation = case when trim(message_confirmation) = '' then
    '¡Hola {cliente}! Confirmamos tu turno de {servicio} para el {fecha} a las {hora}. Te esperamos en {negocio}.'
    else message_confirmation end,
  message_reminder = case when trim(message_reminder) = '' then
    '¡Hola {cliente}! Te recordamos tu turno de {servicio} el {fecha} a las {hora}. Si no podés venir, avisanos así liberamos el lugar.'
    else message_reminder end,
  message_cancellation = case when trim(message_cancellation) = '' then
    'Hola {cliente}, cancelamos tu turno de {servicio} del {fecha} a las {hora}. Escribinos cuando quieras y coordinamos uno nuevo.'
    else message_cancellation end,
  message_status_change = case when trim(message_status_change) = '' then
    'Hola {cliente}, tu turno de {servicio} del {fecha} a las {hora} pasó a: {estado}.'
    else message_status_change end
where id = true;

-- Red final: la fila única tiene que existir siempre. Si por cualquier motivo
-- se perdió, se recrea con todos los valores por defecto ya cargados.
insert into public.business_settings (id)
values (true)
on conflict (id) do nothing;
