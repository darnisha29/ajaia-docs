import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import type { SessionUser } from "@/lib/types"

export type SeededUserButtonProps = {
  user: SessionUser
  pending: boolean
  disabled: boolean
  onSelect: () => void
}

const initials = (name: string): string =>
  name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

const SeededUserButton = ({
  user,
  pending,
  disabled,
  onSelect,
}: SeededUserButtonProps) => (
  <button
    type="button"
    onClick={onSelect}
    disabled={disabled}
    className={cn(
      "flex w-full cursor-pointer items-center gap-3 rounded-[var(--radius)] border border-border px-3 py-2.5 text-left transition-colors",
      "hover:border-primary hover:bg-primary-soft",
      "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:bg-transparent",
    )}
  >
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
      {initials(user.name)}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-medium">{user.name}</span>
      <span className="block truncate text-xs text-muted-foreground">
        {user.email}
      </span>
    </span>
    {pending ? (
      <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
    ) : null}
  </button>
)

export default SeededUserButton
