import { AlertCircle, Check, Eye, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import type { SaveStatus as Status } from "@/hooks/useAutosave"

export type SaveStatusProps = {
  status: Status
  readOnly: boolean
}

// The header is tight on phones, so the label collapses and the icon carries the
// meaning. The icon is never hidden — a user needs to know their work is saved
// at every viewport, and title/sr-only keep it available to assistive tech and
// on hover.
const Label = ({ children }: { children: string }) => (
  <span className="hidden sm:inline">{children}</span>
)

const SaveStatus = ({ status, readOnly }: SaveStatusProps) => {
  const shell = "flex items-center gap-1.5 text-xs"

  if (readOnly) {
    return (
      <span
        className={cn(shell, "text-muted-foreground")}
        title="View only"
      >
        <Eye className="size-3" />
        <Label>View only</Label>
        <span className="sr-only">View only</span>
      </span>
    )
  }

  if (status === "saving") {
    return (
      <span
        className={cn(shell, "text-muted-foreground")}
        title="Saving…"
      >
        <Loader2 className="size-3 animate-spin" />
        <Label>Saving…</Label>
        <span className="sr-only">Saving</span>
      </span>
    )
  }

  if (status === "error") {
    return (
      <span
        className={cn(shell, "text-destructive")}
        title="Not saved — your last change could not be saved"
      >
        <AlertCircle className="size-3" />
        <Label>Not saved</Label>
        <span className="sr-only">Not saved</span>
      </span>
    )
  }

  if (status === "unsaved") {
    return (
      <span
        className={cn(shell, "text-muted-foreground")}
        title="Unsaved changes"
      >
        <span
          aria-hidden
          className="size-1.5 rounded-full bg-muted-foreground"
        />
        <Label>Unsaved changes</Label>
        <span className="sr-only">Unsaved changes</span>
      </span>
    )
  }

  // "idle" (nothing typed yet) and "saved" both mean the stored copy is current.
  return (
    <span
      className={cn(
        shell,
        status === "saved" ? "text-success" : "text-muted-foreground",
      )}
      title="All changes saved"
    >
      <Check className="size-3" />
      <Label>Saved</Label>
      <span className="sr-only">All changes saved</span>
    </span>
  )
}

export default SaveStatus
