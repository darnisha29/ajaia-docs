"use client"

import { Download, Paperclip, Trash2 } from "lucide-react"

import { formatFileSize } from "@/utils/formatFileSize"
import type { AttachmentEntry } from "@/lib/types"

export type AttachmentRowProps = {
  attachment: AttachmentEntry
  canEdit: boolean
  busy: boolean
  onDownload: () => void
  onDelete: () => void
}

const AttachmentRow = ({
  attachment,
  canEdit,
  busy,
  onDownload,
  onDelete,
}: AttachmentRowProps) => (
  <li className="flex items-center gap-3 rounded-[var(--radius)] border border-border px-3 py-2">
    <Paperclip className="size-4 shrink-0 text-muted-foreground" />

    <div className="min-w-0 flex-1">
      <p className="truncate text-sm">{attachment.fileName}</p>
      <p className="truncate text-xs text-muted-foreground">
        {formatFileSize(attachment.sizeBytes)}
        {attachment.uploadedBy ? ` · ${attachment.uploadedBy.name}` : ""}
      </p>
    </div>

    <button
      type="button"
      onClick={onDownload}
      disabled={busy}
      aria-label={`Download ${attachment.fileName}`}
      className="cursor-pointer rounded-[var(--radius)] p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
    >
      <Download className="size-3.5" />
    </button>

    {canEdit ? (
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        aria-label={`Delete ${attachment.fileName}`}
        className="cursor-pointer rounded-[var(--radius)] p-1.5 text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive disabled:opacity-50"
      >
        <Trash2 className="size-3.5" />
      </button>
    ) : null}
  </li>
)

export default AttachmentRow
