"use client"

import { useRef, useState } from "react"
import { Paperclip } from "lucide-react"
import { toast } from "sonner"

import AttachmentRow from "@/sections/DocumentEditor/editor/AttachmentRow"
import { ApiError, apiFetch, apiUpload } from "@/lib/apiClient"
import { Button } from "@/components/ui/button"
import type { AttachmentEntry } from "@/lib/types"

export type AttachmentsPanelProps = {
  documentId: string
  canEdit: boolean
  attachments: AttachmentEntry[]
  onAttachmentsChange: (attachments: AttachmentEntry[]) => void
}

const AttachmentsPanel = ({
  documentId,
  canEdit,
  attachments,
  onAttachmentsChange,
}: AttachmentsPanelProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    const { attachments: next } = await apiFetch<{
      attachments: AttachmentEntry[]
    }>(`/api/documents/${documentId}/attachments`)

    onAttachmentsChange(next)
  }

  const withBusy = async (action: () => Promise<void>, fallback: string) => {
    setBusy(true)

    try {
      await action()
      await refresh()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : fallback)
    } finally {
      setBusy(false)
    }
  }

  const download = async (attachmentId: string) => {
    try {
      // The bucket is private, so the server mints a short-lived signed URL
      // after checking access; we just follow it.
      const { url } = await apiFetch<{ url: string }>(
        `/api/documents/${documentId}/attachments/${attachmentId}`,
      )

      window.open(url, "_blank", "noopener,noreferrer")
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not download file.",
      )
    }
  }

  return (
    <section className="mt-10 border-t border-border pt-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Paperclip className="size-4 text-muted-foreground" />
          Attachments
          <span className="text-xs font-normal text-muted-foreground">
            {attachments.length}
          </span>
        </h2>

        {canEdit ? (
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            Attach file
          </Button>
        ) : null}
      </div>

      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {canEdit
            ? "No attachments yet. Any file type, up to 10MB."
            : "No attachments."}
        </p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((attachment) => (
            <AttachmentRow
              key={attachment.id}
              attachment={attachment}
              canEdit={canEdit}
              busy={busy}
              onDownload={() => download(attachment.id)}
              onDelete={() =>
                withBusy(async () => {
                  await apiFetch(
                    `/api/documents/${documentId}/attachments/${attachment.id}`,
                    { method: "DELETE" },
                  )
                  toast.success("Attachment deleted.")
                }, "Could not delete attachment.")
              }
            />
          ))}
        </ul>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          if (!file) return

          withBusy(async () => {
            await apiUpload(`/api/documents/${documentId}/attachments`, file)
            toast.success("File attached.")
          }, "Could not attach that file.")
        }}
      />
    </section>
  )
}

export default AttachmentsPanel
