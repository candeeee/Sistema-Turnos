'use client'

import Image from 'next/image'

import type { Service } from '@/lib/services/catalog'
import { serviceImageUrl } from '@/utils/images'
import { formatDuration, formatPrice } from '@/utils/format'

export function ServicePicker({
  services,
  selectedId,
  onSelect,
}: {
  services: Service[]
  selectedId: string | null
  onSelect: (service: Service) => void
}) {
  if (services.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] border border-line bg-surface p-6 text-sm text-muted">
        Todavía no hay servicios disponibles para reservar. Escribinos y coordinamos por privado.
      </p>
    )
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {services.map((service, index) => {
        const image = serviceImageUrl(service.image_path)
        const isSelected = service.id === selectedId

        return (
          <li
            key={service.id}
            className="animate-rise"
            style={{ '--delay': `${index * 45}ms` } as React.CSSProperties}
          >
            <button
              type="button"
              onClick={() => onSelect(service)}
              aria-pressed={isSelected}
              className={`flex h-full w-full gap-4 rounded-[var(--radius-card)] border bg-surface p-4 text-left
                transition-all duration-200 ease-[var(--ease-soft)] hover:-translate-y-0.5
                ${isSelected ? 'border-accent ring-1 ring-accent' : 'border-line hover:border-ink'}`}
            >
              {image && (
                <Image
                  src={image}
                  alt=""
                  width={72}
                  height={72}
                  className="h-18 w-18 shrink-0 rounded-xl object-cover"
                />
              )}

              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">{service.name}</span>

                {service.description && (
                  <span className="mt-1 line-clamp-2 text-sm text-muted">{service.description}</span>
                )}

                <span className="tnum mt-2 text-sm">
                  {formatPrice(service.price)}
                  <span className="text-muted"> · {formatDuration(service.duration_min)}</span>
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
