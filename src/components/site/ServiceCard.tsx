import Image from 'next/image'
import Link from 'next/link'

import type { Service } from '@/lib/services/catalog'
import { serviceImageUrl } from '@/utils/images'
import { formatDuration, formatPrice } from '@/utils/format'
import { ROUTES } from '@/lib/constants'

export function ServiceCard({
  service,
  index = 0,
  showBooking = true,
}: {
  service: Service
  index?: number
  /** El administrador no reserva turnos: para él la tarjeta es informativa. */
  showBooking?: boolean
}) {
  const image = serviceImageUrl(service.image_path)

  return (
    <article
      className="animate-rise group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-soft transition-all duration-500 ease-[var(--ease-out-quiet)] hover:-translate-y-1.5 hover:shadow-lifted"
      style={{ '--delay': `${index * 70}ms` } as React.CSSProperties}
    >
      {image && (
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={image}
            alt={service.name}
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover transition-transform duration-[900ms] ease-[var(--ease-out-quiet)] group-hover:scale-[1.04]"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-2xl font-light leading-snug">{service.name}</h3>

        {service.description && (
          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{service.description}</p>
        )}

        <p className="tnum mt-4 text-sm">
          {formatPrice(service.price)}
          <span className="text-muted"> · {formatDuration(service.duration_min)}</span>
        </p>

        {showBooking && (
          <Link
            href={ROUTES.book}
            className="mt-5 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-accent transition-all duration-200 hover:gap-2.5"
          >
            Reservar
            <span aria-hidden>→</span>
          </Link>
        )}
      </div>
    </article>
  )
}
