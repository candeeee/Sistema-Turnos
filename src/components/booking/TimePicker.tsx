'use client'

import { useEffect, useState, useTransition } from 'react'
import { motion } from 'framer-motion'

import { fetchSlotsAction } from '@/lib/actions/booking'
import type { Slot } from '@/lib/services/availability'
import { formatDateLong, formatTime } from '@/utils/format'
import type { DateKey } from '@/utils/date'

/** Agrupar por franja da una referencia inmediata sin leer todas las horas. */
const GROUPS = [
  { label: 'Mañana', until: 13 },
  { label: 'Tarde', until: 19 },
  { label: 'Noche', until: 24 },
] as const

function SlotsSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      {[6, 8].map((count, group) => (
        <div key={group}>
          <div className="skeleton mb-3 h-3 w-16" />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {Array.from({ length: count }, (_, index) => (
              <div key={index} className="skeleton h-12 rounded-full" />
            ))}
          </div>
        </div>
      ))}
      <span className="sr-only">Buscando horarios…</span>
    </div>
  )
}

export function TimePicker({
  serviceId,
  date,
  timeZone,
  selected,
  onSelect,
}: {
  serviceId: string
  date: DateKey
  timeZone: string
  selected: string | null
  onSelect: (startsAt: string) => void
}) {
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    setSlots(null)

    startTransition(async () => {
      const result = await fetchSlotsAction(serviceId, date)
      if (!cancelled) setSlots(result)
    })

    return () => {
      cancelled = true
    }
  }, [serviceId, date])

  if (slots === null) return <SlotsSkeleton />

  if (slots.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-8 text-center shadow-soft">
        <p className="font-display text-xl font-light">
          No quedan horarios el {formatDateLong(`${date}T12:00:00Z`, 'UTC')}
        </p>
        <p className="mt-2 text-sm text-muted">Volvé al paso anterior y probá con otro día.</p>
      </div>
    )
  }

  const grouped = GROUPS.map((group, index) => {
    const from = index === 0 ? 0 : GROUPS[index - 1]!.until
    return {
      label: group.label,
      slots: slots.filter((slot) => {
        const hour = Number(formatTime(slot.startsAt, timeZone).slice(0, 2))
        return hour >= from && hour < group.until
      }),
    }
  }).filter((group) => group.slots.length > 0)

  return (
    <div className="flex flex-col gap-7">
      {grouped.map((group, groupIndex) => (
        <section key={group.label}>
          <h3 className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted">{group.label}</h3>

          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {group.slots.map((slot, index) => {
              const isSelected = slot.startsAt === selected

              return (
                <motion.li
                  key={slot.startsAt}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: Math.min((groupIndex * 6 + index) * 0.02, 0.4),
                    duration: 0.3,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(slot.startsAt)}
                    aria-pressed={isSelected}
                    className={`tnum w-full rounded-full border py-3 text-sm transition-all duration-300 ease-[var(--ease-soft)] active:scale-[0.97] ${
                      isSelected
                        ? 'border-accent bg-accent text-white shadow-soft'
                        : 'border-line bg-surface text-ink hover:border-accent/50 hover:bg-accent-soft hover:text-accent-ink'
                    }`}
                  >
                    {formatTime(slot.startsAt, timeZone)}
                  </button>
                </motion.li>
              )
            })}
          </ul>
        </section>
      ))}

      <p className="text-xs text-muted">
        Solo aparecen los horarios que quedan libres considerando la duración del servicio.
      </p>
    </div>
  )
}
