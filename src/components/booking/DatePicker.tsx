'use client'

import { useEffect, useState, useTransition } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { fetchAvailableDaysAction } from '@/lib/actions/booking'
import {
  addDays,
  addMonths,
  firstDayOfMonth,
  isSameMonth,
  lastDayOfMonth,
  monthGrid,
  weekdayIndex,
  type DateKey,
} from '@/utils/date'
import { formatDayNumber, formatMonth } from '@/utils/format'
import { WEEKDAYS } from '@/lib/constants'

/**
 * Calendario del flujo de reserva.
 *
 * Decisiones:
 * · Un día sin horarios no se "deshabilita en gris": se muestra en un tono
 *   apenas visible, sin borde ni fondo. La ausencia de peso visual comunica
 *   la indisponibilidad mejor que un color de error.
 * · El día seleccionado usa `layoutId`, así que el círculo del acento se
 *   desliza de un día al otro en vez de saltar.
 * · Los fines de semana se diferencian solo por el color de la etiqueta.
 * · El cambio de mes entra desde el lado hacia el que se navega.
 */
export function DatePicker({
  serviceId,
  today,
  maxDaysAhead,
  selected,
  onSelect,
}: {
  serviceId: string
  today: DateKey
  maxDaysAhead: number
  selected: DateKey | null
  onSelect: (date: DateKey) => void
}) {
  const [month, setMonth] = useState<DateKey>(firstDayOfMonth(selected ?? today))
  const [direction, setDirection] = useState<1 | -1>(1)
  const [days, setDays] = useState<Record<DateKey, number> | null>(null)
  const [, startTransition] = useTransition()

  const lastBookable = addDays(today, maxDaysAhead)

  useEffect(() => {
    let cancelled = false
    setDays(null)

    startTransition(async () => {
      const result = await fetchAvailableDaysAction(
        serviceId,
        firstDayOfMonth(month),
        lastDayOfMonth(month),
      )
      if (!cancelled) setDays(result)
    })

    return () => {
      cancelled = true
    }
  }, [serviceId, month])

  const canGoBack = !isSameMonth(month, today)
  const canGoForward = firstDayOfMonth(addMonths(month, 1)) <= lastBookable

  function goTo(step: 1 | -1) {
    setDirection(step)
    setMonth(addMonths(month, step))
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-soft sm:p-7">
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => goTo(-1)}
          disabled={!canGoBack}
          aria-label="Mes anterior"
          className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-muted transition-all duration-300 hover:bg-accent-soft hover:text-accent-ink disabled:opacity-25 disabled:hover:bg-transparent"
        >
          ‹
        </button>

        <p className="font-display text-xl font-light tracking-wide" aria-live="polite">
          {formatMonth(month)}
        </p>

        <button
          type="button"
          onClick={() => goTo(1)}
          disabled={!canGoForward}
          aria-label="Mes siguiente"
          className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-muted transition-all duration-300 hover:bg-accent-soft hover:text-accent-ink disabled:opacity-25 disabled:hover:bg-transparent"
        >
          ›
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((day, index) => (
          <abbr
            key={day}
            title={day}
            className={`pb-1 text-[10px] uppercase tracking-[0.14em] no-underline ${
              index === 0 || index === 6 ? 'text-accent/60' : 'text-muted/70'
            }`}
          >
            {day.slice(0, 2)}
          </abbr>
        ))}
      </div>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={month}
            initial={{ opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -24 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-7 gap-1"
          >
            {monthGrid(month).map((day) => {
              const inMonth = isSameMonth(day, month)
              const count = days?.[day] ?? 0
              const loading = days === null
              const isSelectable = inMonth && count > 0 && day >= today && day <= lastBookable
              const isSelected = day === selected
              const isToday = day === today
              const isWeekend = weekdayIndex(day) === 0 || weekdayIndex(day) === 6

              if (!inMonth) return <span key={day} aria-hidden />

              return (
                <button
                  key={day}
                  type="button"
                  disabled={!isSelectable}
                  onClick={() => onSelect(day)}
                  aria-label={
                    isSelectable
                      ? `${formatDayNumber(day)}, ${count} horarios disponibles`
                      : `${formatDayNumber(day)}, sin horarios`
                  }
                  aria-pressed={isSelected}
                  className="group relative flex aspect-square items-center justify-center"
                >
                  {isSelected && (
                    <motion.span
                      layoutId="dia-elegido"
                      className="absolute inset-1 rounded-full bg-accent"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}

                  <span
                    className={`tnum relative z-10 text-sm transition-colors duration-300 ${
                      isSelected
                        ? 'text-white'
                        : loading
                          ? 'text-muted/30'
                          : isSelectable
                            ? `${isWeekend ? 'text-accent-ink' : 'text-ink'} group-hover:text-accent`
                            : 'text-muted/25'
                    }`}
                  >
                    {formatDayNumber(day)}
                  </span>

                  {/* Punto del día de hoy y marca de disponibilidad. */}
                  {isToday && !isSelected && (
                    <span
                      aria-hidden
                      className="absolute bottom-1.5 h-1 w-1 rounded-full bg-accent"
                    />
                  )}

                  {isSelectable && !isSelected && !isToday && (
                    <span
                      aria-hidden
                      className="absolute inset-1 rounded-full bg-accent-soft opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    />
                  )}
                </button>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="mt-5 text-center text-xs text-muted">
        {days === null ? 'Buscando disponibilidad…' : 'Los días sin lugar aparecen atenuados.'}
      </p>
    </div>
  )
}
