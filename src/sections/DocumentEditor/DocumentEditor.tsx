"use client"

import Link from "next/link"
import { useCallback, useState } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import { ArrowLeft, Share2 } from "lucide-react"
import { toast } from "sonner"

import AppHeader from "@/components/common/AppHeader"
import AttachmentsPanel from "@/sections/DocumentEditor/editor/AttachmentsPanel"
import DocumentTitle from "@/sections/DocumentEditor/editor/DocumentTitle"
import EditorToolbar from "@/sections/DocumentEditor/editor/EditorToolbar"
import SaveStatus from "@/sections/DocumentEditor/editor/SaveStatus"
import ShareDialog from "@/sections/DocumentEditor/editor/ShareDialog"
import { ApiError, apiFetch } from "@/lib/apiClient"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { editorExtensions } from "@/sections/DocumentEditor/editor/editorExtensions"
import { mergeSaveStatus } from "@/utils/mergeSaveStatus"
import { useAutosave } from "@/hooks/useAutosave"
import type {
  AttachmentEntry,
  DocumentDetail,
  SessionUser,
  ShareEntry,
} from "@/lib/types"

export type DocumentEditorProps = {
  user: SessionUser
  document: DocumentDetail
}

const DocumentEditor = ({ user, document: doc }: DocumentEditorProps) => {
  const [title, setTitle] = useState(doc.title)
  const [shares, setShares] = useState<ShareEntry[]>(doc.shares)
  const [attachments, setAttachments] = useState<AttachmentEntry[]>(
    doc.attachments,
  )
  const [shareOpen, setShareOpen] = useState(false)

  const canEdit = doc.canEdit

  const patch = useCallback(
    async (body: { title?: string; contentHtml?: string }) => {
      try {
        await apiFetch(`/api/documents/${doc.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        })
      } catch (error) {
        // Re-thrown so the hook can show "Not saved"; the toast explains why.
        toast.error(
          error instanceof ApiError
            ? error.message
            : "Changes could not be saved.",
        )
        throw error
      }
    },
    [doc.id],
  )

  // Title and content save independently so a rename never has to wait behind a
  // large content write (and vice versa).
  const contentSave = useAutosave<string>({
    save: useCallback((contentHtml: string) => patch({ contentHtml }), [patch]),
  })

  const titleSave = useAutosave<string>({
    save: useCallback(
      (nextTitle: string) => patch({ title: nextTitle }),
      [patch],
    ),
  })

  const editor = useEditor({
    extensions: editorExtensions,
    content: doc.contentHtml,
    editable: canEdit,
    // Required with the App Router: rendering the editor during SSR produces
    // markup React then disagrees with on hydration.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "document-content min-h-[55vh] max-w-none",
      },
    },
    onUpdate: ({ editor: instance }) => {
      if (!canEdit) return
      contentSave.schedule(instance.getHTML())
    },
  })

  const onTitleChange = (next: string) => {
    setTitle(next)
    // An empty title would fail validation; the server substitutes the default
    // on save, so only schedule once there's something to store.
    if (next.trim()) titleSave.schedule(next)
  }

  const status = mergeSaveStatus(contentSave.status, titleSave.status)

  return (
    <div className="min-h-dvh">
      <AppHeader user={user}>
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/documents"
            aria-label="Back to documents"
            className="shrink-0 rounded-[var(--radius)] p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </Link>

          <div className="min-w-0 flex-1">
            <DocumentTitle
              title={title}
              readOnly={!canEdit}
              onChange={onTitleChange}
            />
          </div>

          {/* Always rendered, including on mobile: autosave with no visible
              confirmation is the one place a user can't tell whether their work
              survived. SaveStatus drops its label on narrow screens and shows
              just the icon. */}
          <div className="shrink-0">
            <SaveStatus
              status={status}
              readOnly={!canEdit}
            />
          </div>

          {doc.role !== "owner" ? (
            <Badge
              variant="primary"
              className="hidden shrink-0 md:inline-flex"
            >
              Shared by {doc.owner.name}
            </Badge>
          ) : null}

          {doc.canManageSharing ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="size-3.5" />
              Share
            </Button>
          ) : null}
        </div>
      </AppHeader>

      <EditorToolbar
        editor={editor}
        disabled={!canEdit}
      />

      <main className="mx-auto max-w-3xl px-4 py-10">
        <div
          className="rounded-[calc(var(--radius)*1.4)] border border-border bg-surface px-6 py-8 shadow-sm sm:px-10 sm:py-12"
          onClick={() => canEdit && editor?.chain().focus().run()}
        >
          <EditorContent editor={editor} />
        </div>

        <AttachmentsPanel
          documentId={doc.id}
          canEdit={canEdit}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
        />
      </main>

      {doc.canManageSharing ? (
        <ShareDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          documentId={doc.id}
          owner={doc.owner}
          shares={shares}
          onSharesChange={setShares}
        />
      ) : null}
    </div>
  )
}

export default DocumentEditor
