"use client"

import Link from "next/link"
import { useState } from "react"
import { Eye, Trash2, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { formatRelativeTime } from "@/utils/formatRelativeTime"
import type { DocumentSummary } from "@/lib/types"

export type DocumentCardProps = {
  document: DocumentSummary
  /** Omitted for shared documents — only an owner may delete. */
  onDelete?: (id: string) => void
}

const DocumentCard = ({ document, onDelete }: DocumentCardProps) => {
  const [confirming, setConfirming] = useState(false)
  const isOwner = document.role === "owner"

  return (
    <li className="group relative">
      <Link
        href={`/documents/${document.id}`}
        className="flex h-full flex-col rounded-[calc(var(--radius)*1.2)] border border-border bg-surface p-4 transition-colors hover:border-primary"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 flex-1 text-sm font-medium">
            {document.title}
          </h3>
          {document.role === "viewer" ? (
            <Badge variant="neutral">
              <Eye className="size-3" />
              View only
            </Badge>
          ) : null}
        </div>

        <p className="mt-2 line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">
          {document.preview || "Empty document"}
        </p>

        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {isOwner ? "You" : document.owner.name} ·{" "}
            {formatRelativeTime(document.updatedAt)}
          </span>

          {isOwner && document.sharedWithCount > 0 ? (
            <span className="ml-auto flex items-center gap-1">
              <Users className="size-3" />
              {document.sharedWithCount}
            </span>
          ) : null}
        </div>
      </Link>

      {onDelete && isOwner ? (
        <div className="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {confirming ? (
            <span className="flex items-center gap-1 rounded-[var(--radius)] border border-border bg-surface p-1 shadow-sm">
              <button
                type="button"
                onClick={() => onDelete(document.id)}
                className="cursor-pointer rounded px-1.5 py-0.5 text-xs font-medium text-destructive hover:bg-destructive-soft"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="cursor-pointer rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={`Delete ${document.title}`}
              className="cursor-pointer rounded-[var(--radius)] bg-surface p-1.5 text-muted-foreground shadow-sm transition-colors hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      ) : null}
    </li>
  )
}

export default DocumentCard
