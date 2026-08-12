import { AlertCircle, Check, Loader2 } from "lucide-react"

import type { SaveStatus as Status } from "@/hooks/useAutosave"

export type SaveStatusProps = {
  status: Status
  readOnly: boolean
}

const SaveStatus = ({ status, readOnly }: SaveStatusProps) => {
  if (readOnly) {
    return <span className="text-xs text-muted-foreground">View only</span>
  }

  if (status === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Saving…
      </span>
    )
  }

  if (status === "saved") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-success">
        <Check className="size-3" />
        Saved
      </span>
    )
  }

  if (status === "error") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-destructive">
        <AlertCircle className="size-3" />
        Not saved
      </span>
    )
  }

  if (status === "unsaved") {
    return (
      <span className="text-xs text-muted-foreground">Unsaved changes</span>
    )
  }

  return (
    <span className="text-xs text-muted-foreground">All changes saved</span>
  )
}

export default SaveStatus
