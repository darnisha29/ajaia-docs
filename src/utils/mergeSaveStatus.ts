import type { SaveStatus } from "@/hooks/useAutosave"

// Title and content autosave independently, but the header shows one status.
// Rank by urgency so a failure is never masked by a sibling's "Saved".
const RANK: Record<SaveStatus, number> = {
  error: 4,
  saving: 3,
  unsaved: 2,
  saved: 1,
  idle: 0,
}

export const mergeSaveStatus = (...statuses: SaveStatus[]): SaveStatus =>
  statuses.reduce(
    (worst, status) => (RANK[status] > RANK[worst] ? status : worst),
    "idle",
  )
