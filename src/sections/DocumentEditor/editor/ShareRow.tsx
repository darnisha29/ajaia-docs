"use client"

import { X } from "lucide-react"

import type { ShareEntry } from "@/lib/types"
import type { ShareRole } from "@/lib/database.types"

export type ShareRowProps = {
  share: ShareEntry
  busy: boolean
  onRoleChange: (role: ShareRole) => void
  onRemove: () => void
}

const ShareRow = ({ share, busy, onRoleChange, onRemove }: ShareRowProps) => (
  <li className="flex items-center gap-3 py-2">
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium">{share.user.name}</p>
      <p className="truncate text-xs text-muted-foreground">
        {share.user.email}
      </p>
    </div>

    <select
      value={share.role}
      disabled={busy}
      onChange={(event) => onRoleChange(event.target.value as ShareRole)}
      aria-label={`Access level for ${share.user.name}`}
      className="h-8 cursor-pointer rounded-[var(--radius)] border border-border bg-surface px-2 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
    >
      <option value="viewer">Can view</option>
      <option value="editor">Can edit</option>
    </select>

    <button
      type="button"
      onClick={onRemove}
      disabled={busy}
      aria-label={`Remove access for ${share.user.name}`}
      className="cursor-pointer rounded-[var(--radius)] p-1.5 text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive disabled:opacity-50"
    >
      <X className="size-3.5" />
    </button>
  </li>
)

export default ShareRow
