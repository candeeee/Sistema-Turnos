'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { serviceSchema } from '@/lib/validations/admin'
import { toFieldErrors, type ActionResult, type FormState } from '@/lib/actions/types'
import { toUserMessage } from '@/utils/errors'
import { slugify } from '@/utils/slug'

function revalidateCatalog() {
  revalidatePath('/admin/servicios')
  revalidatePath('/servicios')
  revalidatePath('/')
  revalidatePath('/reservar')
}

/** Alta y edición comparten formulario: si viene `id`, actualiza. */
export async function saveServiceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = serviceSchema.safeParse({
    id: formData.get('id') || undefined,
    name: formData.get('name'),
    description: formData.get('description') ?? '',
    durationMin: formData.get('durationMin'),
    bufferMin: formData.get('bufferMin') ?? 0,
    price: formData.get('price'),
    imagePath: formData.get('imagePath') || null,
    isActive: formData.get('isActive') === 'on',
    isFeatured: formData.get('isFeatured') === 'on',
    sortOrder: formData.get('sortOrder') ?? 0,
  })

  if (!parsed.success) {
    return { status: 'error', fieldErrors: toFieldErrors(parsed.error.issues) }
  }

  const supabase = await createClient()
  const values = {
    name: parsed.data.name,
    slug: slugify(parsed.data.name),
    description: parsed.data.description,
    duration_min: parsed.data.durationMin,
    buffer_min: parsed.data.bufferMin,
    price: parsed.data.price,
    image_path: parsed.data.imagePath ?? null,
    is_active: parsed.data.isActive,
    is_featured: parsed.data.isFeatured,
    sort_order: parsed.data.sortOrder,
  }

  const { error } = parsed.data.id
    ? await supabase.from('services').update(values).eq('id', parsed.data.id)
    : await supabase.from('services').insert(values)

  if (error) {
    if (error.code === '23505') {
      return { status: 'error', error: 'Ya existe un servicio con ese nombre.' }
    }
    return { status: 'error', error: toUserMessage(error, 'saveService') }
  }

  revalidateCatalog()
  return { status: 'success', message: 'Servicio guardado.' }
}

export async function toggleServiceAction(id: string, isActive: boolean): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('services').update({ is_active: isActive }).eq('id', id)

  if (error) {
    return { ok: false, error: toUserMessage(error, 'toggleService') }
  }

  revalidateCatalog()
  return { ok: true }
}

/**
 * Eliminar un servicio con turnos asociados está bloqueado por la clave
 * foránea (on delete restrict): borrarlo dejaría turnos históricos sin
 * referencia. En ese caso se ofrece desactivarlo.
 */
export async function deleteServiceAction(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('services').delete().eq('id', id)

  if (error) {
    if (error.code === '23503') {
      return {
        ok: false,
        error: 'Este servicio tiene turnos asociados y no se puede eliminar. Desactivalo.',
      }
    }
    return { ok: false, error: toUserMessage(error, 'deleteService') }
  }

  revalidateCatalog()
  return { ok: true }
}
