const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Short relative label for list rows: "just now", "12m ago", "3h ago",
 * then an absolute date once it stops being useful to count.
 */
export const formatRelativeTime = (
  isoDate: string,
  now: number = Date.now(),
): string => {
  const timestamp = new Date(isoDate).getTime()
  if (Number.isNaN(timestamp)) return ""

  const elapsed = now - timestamp

  // Clock skew between the database and the browser can make a fresh write look
  // like it happened in the future; show it as current rather than "-1m ago".
  if (elapsed < MINUTE) return "just now"
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}d ago`

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
