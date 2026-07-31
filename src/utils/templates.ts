/**
 * Plantillas de mensajes.
 *
 * El negocio escribe el texto con variables entre llaves y el sistema las
 * reemplaza. El renderizado vive acá y no en SQL a propósito: el mismo texto
 * sirve para WhatsApp hoy y para email o push mañana sin tocar la base.
 *
 * Una variable desconocida se deja tal cual en lugar de borrarse: si alguien
 * escribe {telefono} por error, lo ve en la vista previa en vez de descubrir
 * un hueco en el mensaje ya enviado.
 */

export const TEMPLATE_VARIABLES = [
  { key: 'cliente', description: 'Nombre del cliente' },
  { key: 'servicio', description: 'Nombre del servicio' },
  { key: 'fecha', description: 'Fecha del turno' },
  { key: 'hora', description: 'Hora del turno' },
  { key: 'negocio', description: 'Nombre del negocio' },
  { key: 'precio', description: 'Precio del servicio' },
  { key: 'senia', description: 'Monto de la seña' },
  { key: 'alias', description: 'Alias para transferir' },
  { key: 'estado', description: 'Estado del turno' },
] as const

export type TemplateValues = Partial<Record<(typeof TEMPLATE_VARIABLES)[number]['key'], string>>

/**
 * Acepta un texto ausente y devuelve una cadena vacía.
 *
 * Esto NO es lo que garantiza que las plantillas existan: de eso se encarga
 * `normalizeSettings()` en la capa de servicios, que completa los faltantes
 * con los valores por defecto y avisa en el log si la base está
 * desactualizada. Esta tolerancia es la última red: una función de formateo
 * de texto no debería poder tumbar una pantalla entera, y menos aún cuando la
 * llama un componente cliente que no puede recuperarse del fallo.
 */
export function renderTemplate(
  template: string | null | undefined,
  values: TemplateValues,
): string {
  if (typeof template !== 'string' || template === '') return ''

  return template.replace(/\{(\w+)\}/g, (original, key: string) => {
    const value = values[key as keyof TemplateValues]
    return value ?? original
  })
}

/** Link de WhatsApp con el mensaje ya cargado, listo para enviar. */
export function whatsappMessageLink(phone: string, message: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8 || message.trim() === '') return null

  // Los números argentinos guardados sin código de país se completan: sin él,
  // wa.me abre un chat vacío y el mensaje se pierde.
  const withCountry = digits.startsWith('54') ? digits : `54${digits}`

  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`
}
