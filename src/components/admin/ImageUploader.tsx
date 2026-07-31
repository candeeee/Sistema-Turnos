'use client'

import Image from 'next/image'
import { useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import { serviceImageUrl } from '@/utils/images'

const MAX_BYTES = 5 * 1024 * 1024

/**
 * Sube la imagen directamente del navegador a Supabase Storage.
 *
 * No pasa por el servidor de Next: el archivo viaja una sola vez y las
 * policies del bucket ya restringen la escritura a administradores. El límite
 * de tamaño y los tipos permitidos también están definidos en el bucket, así
 * que esta validación es solo para dar un mensaje inmediato.
 */
export function ImageUploader({ name, defaultPath }: { name: string; defaultPath: string | null }) {
  const [path, setPath] = useState<string | null>(defaultPath)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  async function upload(file: File) {
    setError(null)

    if (file.size > MAX_BYTES) {
      setError('La imagen no puede superar los 5 MB.')
      return
    }

    setUploading(true)

    const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const filePath = `${crypto.randomUUID()}.${extension}`
    const supabase = createClient()

    const { error: uploadError } = await supabase.storage
      .from('services')
      .upload(filePath, file, { cacheControl: '31536000', upsert: false })

    setUploading(false)

    if (uploadError) {
      setError('No pudimos subir la imagen. Probá con otro archivo.')
      return
    }

    setPath(filePath)
  }

  const preview = serviceImageUrl(path)

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Imagen</span>

      <input type="hidden" name={name} value={path ?? ''} />

      <div className="flex items-center gap-4">
        {preview && (
          <Image
            src={preview}
            alt=""
            width={72}
            height={72}
            className="h-18 w-18 rounded-xl object-cover"
          />
        )}

        <label className="cursor-pointer rounded-full border border-line bg-surface px-4 py-2 text-sm transition-colors duration-200 hover:border-ink">
          {uploading ? 'Subiendo…' : preview ? 'Cambiar' : 'Subir imagen'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void upload(file)
            }}
          />
        </label>

        {preview && (
          <button
            type="button"
            onClick={() => setPath(null)}
            className="text-sm text-muted transition-colors duration-200 hover:text-status-cancelled"
          >
            Quitar
          </button>
        )}
      </div>

      {error && <p className="text-xs text-status-cancelled">{error}</p>}
    </div>
  )
}
