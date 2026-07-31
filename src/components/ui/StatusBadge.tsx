import { APPOINTMENT_STATUS } from '@/lib/constants'
import type { AppointmentStatus } from '@/types/database.types'

export function StatusBadge({
  status,
  full = false,
}: {
  status: AppointmentStatus
  full?: boolean
}) {
  const config = APPOINTMENT_STATUS[status]

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
      style={{ color: config.color, backgroundColor: `color-mix(in srgb, ${config.color} 10%, transparent)` }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      {full ? config.label : config.short}
    </span>
  )
}
