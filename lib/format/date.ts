function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function startOfUTCDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function diffUTCDays(a: Date, b: Date): number {
  const aDay = startOfUTCDay(a).getTime()
  const bDay = startOfUTCDay(b).getTime()
  return Math.round((aDay - bDay) / 86_400_000)
}

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const

function formatAbsoluteDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
}

export function formatRelative(
  value: string | Date,
  now: Date = new Date(),
): string {
  const d = toDate(value)
  if (!d) return ""

  const seconds = Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000))
  if (seconds < 5) return "just now"
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = diffUTCDays(now, d)
  if (days < 7) return `${days}d ago`
  return formatAbsoluteDate(d)
}

export function formatRelativeShort(
  value: string | Date,
  now: Date = new Date(),
): string {
  const d = toDate(value)
  if (!d) return ""

  const seconds = Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000))
  if (seconds < 5) return "now"
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = diffUTCDays(now, d)
  if (days < 7) return `${days}d`
  if (days < 30) return `${Math.round(days / 7)}w`
  if (days < 365) return `${Math.round(days / 30)}mo`
  return `${Math.round(days / 365)}y`
}

export function formatSmartRelative(
  value: string | Date,
  now: Date = new Date(),
): string {
  const d = toDate(value)
  if (!d) return ""

  const seconds = Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000))
  if (seconds < 60) return "just now"
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = diffUTCDays(now, d)
  if (days === 1) return "Yesterday"
  if (days < 7) {
    const dayName = DAY_LABELS[d.getDay()]
    return dayName ? dayName : formatAbsoluteDate(d)
  }
  return formatAbsoluteDate(d)
}

export function formatDateWithTime(
  value: string | Date | null | undefined,
): string {
  const d = toDate(value)
  if (!d) return "—"
  return `${formatAbsoluteDate(d)}, ${formatTime(d)}`
}

export function formatDate(
  value: string | Date | null | undefined,
): string {
  const d = toDate(value)
  if (!d) return "—"
  return formatAbsoluteDate(d)
}

export function formatDuration(
  startValue: string | Date | null | undefined,
  endValue: string | Date | null | undefined,
): string {
  const start = toDate(startValue)
  const end = toDate(endValue)
  if (!start || !end) return "—"

  const totalSeconds = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 1000),
  )
  if (totalSeconds < 60) return `${totalSeconds}s`

  const totalMinutes = Math.round(totalSeconds / 60)
  if (totalMinutes < 60) return `${totalMinutes}m`

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`
}
