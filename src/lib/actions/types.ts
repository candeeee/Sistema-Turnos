/**
 * Forma única de respuesta de todas las Server Actions que alimentan un
 * formulario. `fieldErrors` pinta el error debajo del campo; `error` es el
 * mensaje general del formulario.
 */
export type FormState = {
  status: 'idle' | 'error' | 'success'
  error?: string
  fieldErrors?: Record<string, string>
  message?: string
}

export const IDLE_STATE: FormState = { status: 'idle' }

/** Respuesta de las acciones que no alimentan un formulario. */
export type ActionResult = { ok: boolean; error?: string }

/** Convierte los errores de Zod al formato que consumen los formularios. */
export function toFieldErrors(issues: { path: (string | number)[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of issues) {
    const key = String(issue.path[0] ?? 'form')
    fieldErrors[key] ??= issue.message
  }
  return fieldErrors
}
