"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import AppHeader from "@/components/common/AppHeader"
import DocumentGroup from "@/sections/DocumentsPage/DocumentGroup"
import DocumentsToolbar from "@/sections/DocumentsPage/DocumentsToolbar"
import { ApiError, apiFetch } from "@/lib/apiClient"
import type { DocumentSummary, SessionUser } from "@/lib/types"

export type DocumentsPageProps = {
  user: SessionUser
  documents: DocumentSummary[]
}

const DocumentsPage = ({ user, documents }: DocumentsPageProps) => {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  // The owned/shared split is the visible distinction between the two — derived
  // from the role the server resolved, not from a client-side owner comparison.
  const { owned, shared } = useMemo(
    () => ({
      owned: documents.filter((document) => document.role === "owner"),
      shared: documents.filter((document) => document.role !== "owner"),
    }),
    [documents],
  )

  const createDocument = async () => {
    setBusy(true)

    try {
      const { id } = await apiFetch<{ id: string }>("/api/documents", {
        method: "POST",
      })

      router.push(`/documents/${id}`)
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Could not create document.",
      )
      setBusy(false)
    }
  }

  const deleteDocument = async (id: string) => {
    try {
      await apiFetch(`/api/documents/${id}`, { method: "DELETE" })
      toast.success("Document deleted.")
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Could not delete document.",
      )
    }
  }

  return (
    <div className="min-h-dvh">
      <AppHeader user={user} />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <DocumentsToolbar
          busy={busy}
          onCreate={createDocument}
          onBusyChange={setBusy}
        />

        <div className="mt-8 space-y-10">
          <DocumentGroup
            title="My documents"
            emptyMessage="Nothing here yet. Create a document or import a file to get started."
            documents={owned}
            onDelete={deleteDocument}
          />

          <DocumentGroup
            title="Shared with me"
            emptyMessage="No one has shared a document with you yet."
            documents={shared}
          />
        </div>
      </main>
    </div>
  )
}

export default DocumentsPage
