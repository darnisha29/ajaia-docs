import type { DocumentRole } from "@/lib/permissions"
import type { ShareRole } from "@/lib/database.types"

// Wire shapes shared between server and client. camelCase here on purpose:
// snake_case stops at the data-access layer (@/lib/documents) so components
// never mirror column names.

export type SessionUser = {
  id: string
  email: string
  name: string
}

export type DocumentSummary = {
  id: string
  title: string
  /** Truncated plain-text preview for the list; never the full HTML. */
  preview: string
  updatedAt: string
  /** The viewing user's role — drives the owned/shared split in the UI. */
  role: DocumentRole
  owner: SessionUser
  sharedWithCount: number
}

export type ShareEntry = {
  user: SessionUser
  role: ShareRole
}

export type AttachmentEntry = {
  id: string
  fileName: string
  mimeType: string
  sizeBytes: number
  createdAt: string
  uploadedBy: SessionUser | null
}

export type DocumentDetail = {
  id: string
  title: string
  contentHtml: string
  updatedAt: string
  owner: SessionUser
  role: DocumentRole
  canEdit: boolean
  canManageSharing: boolean
  shares: ShareEntry[]
  attachments: AttachmentEntry[]
}
