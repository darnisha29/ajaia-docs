import { supabaseAdmin } from "@/lib/supabase"
import type { DocumentRow, ShareRole } from "@/lib/database.types"

export type DocumentRole = "owner" | ShareRole

export type DocumentAccess = {
  role: DocumentRole | null
  canView: boolean
  canEdit: boolean
  canManageSharing: boolean
  canDelete: boolean
}

export type ResolveAccessInput = {
  ownerId: string
  userId: string | null
  /** The grantee's role from document_shares, or null when no share row exists. */
  shareRole: ShareRole | null
}

const NO_ACCESS: DocumentAccess = {
  role: null,
  canView: false,
  canEdit: false,
  canManageSharing: false,
  canDelete: false,
}

/**
 * The single source of truth for "what may this user do with this document".
 *
 * Deliberately pure — no I/O — so the rules are unit-testable in isolation
 * (see permissions.test.ts). Every route resolves access through this.
 *
 * Rules:
 * - owner   → everything, including sharing and deletion
 * - editor  → read + write content/title, but cannot re-share or delete
 * - viewer  → read only
 * - none    → nothing
 *
 * Ownership wins over any share row: if a document were somehow shared back to
 * its own owner, they keep full owner rights rather than being downgraded.
 */
export const resolveAccess = ({
  ownerId,
  userId,
  shareRole,
}: ResolveAccessInput): DocumentAccess => {
  if (!userId) return NO_ACCESS

  if (userId === ownerId) {
    return {
      role: "owner",
      canView: true,
      canEdit: true,
      canManageSharing: true,
      canDelete: true,
    }
  }

  if (shareRole === "editor") {
    return {
      role: "editor",
      canView: true,
      canEdit: true,
      canManageSharing: false,
      canDelete: false,
    }
  }

  if (shareRole === "viewer") {
    return {
      role: "viewer",
      canView: true,
      canEdit: false,
      canManageSharing: false,
      canDelete: false,
    }
  }

  return NO_ACCESS
}

export type DocumentWithAccess = {
  document: DocumentRow
  access: DocumentAccess
}

/**
 * Loads a document and the caller's access to it in one hop.
 *
 * Returns null when the document does not exist. Returns the row with
 * `access.canView === false` when it exists but the caller cannot see it —
 * callers should treat that as a 404 rather than a 403 so document IDs are not
 * enumerable by unauthorized users.
 */
export const getDocumentAccess = async (
  documentId: string,
  userId: string,
): Promise<DocumentWithAccess | null> => {
  const db = supabaseAdmin()

  const { data: document, error } = await db
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle()

  if (error) throw new Error(`Failed to load document: ${error.message}`)
  if (!document) return null

  const { data: share, error: shareError } = await db
    .from("document_shares")
    .select("role")
    .eq("document_id", documentId)
    .eq("user_id", userId)
    .maybeSingle()

  if (shareError) throw new Error(`Failed to load share: ${shareError.message}`)

  return {
    document,
    access: resolveAccess({
      ownerId: document.owner_id,
      userId,
      shareRole: share?.role ?? null,
    }),
  }
}
