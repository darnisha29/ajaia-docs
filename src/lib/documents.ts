import { supabaseAdmin } from "@/lib/supabase"
import { htmlToPlainText, sanitizeDocumentHtml } from "@/lib/sanitize"
import { resolveAccess } from "@/lib/permissions"
import type {
  Database,
  DocumentRow,
  ShareRole,
  UserRow,
} from "@/lib/database.types"
import type {
  AttachmentEntry,
  DocumentSummary,
  SessionUser,
  ShareEntry,
} from "@/lib/types"

// All document reads/writes funnel through here so sanitization, preview
// derivation, and the snake_case → camelCase boundary live in exactly one place.

export const PREVIEW_LENGTH = 180
export const DEFAULT_TITLE = "Untitled document"

const toSessionUser = (user: UserRow): SessionUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
})

const toPreview = (contentText: string): string =>
  contentText.length > PREVIEW_LENGTH
    ? `${contentText.slice(0, PREVIEW_LENGTH).trimEnd()}…`
    : contentText

/**
 * Owned documents plus documents shared with the user, newest-updated first.
 *
 * Deliberately three small queries rather than one nested join: the join through
 * document_shares → documents → users is where PostgREST relationship inference
 * gets brittle, and at this scale stitching in JS is both clearer and cheap.
 */
export const listDocumentsForUser = async (
  userId: string,
): Promise<DocumentSummary[]> => {
  const db = supabaseAdmin()

  const [owned, shares] = await Promise.all([
    db
      .from("documents")
      .select("*")
      .eq("owner_id", userId)
      .order("updated_at", { ascending: false }),
    db
      .from("document_shares")
      .select("document_id, role")
      .eq("user_id", userId),
  ])

  if (owned.error)
    throw new Error(`Failed to list documents: ${owned.error.message}`)
  if (shares.error)
    throw new Error(`Failed to list shares: ${shares.error.message}`)

  const sharedRoleByDocument = new Map<string, ShareRole>(
    (shares.data ?? []).map((share) => [share.document_id, share.role]),
  )

  let sharedDocuments: DocumentRow[] = []

  if (sharedRoleByDocument.size > 0) {
    const { data, error } = await db
      .from("documents")
      .select("*")
      .in("id", [...sharedRoleByDocument.keys()])
      .order("updated_at", { ascending: false })

    if (error)
      throw new Error(`Failed to list shared documents: ${error.message}`)

    // A user can be both owner and grantee only if a share row was created for
    // the owner; filter here so a document never appears in both lists.
    sharedDocuments = (data ?? []).filter(
      (document) => document.owner_id !== userId,
    )
  }

  const allDocuments = [...(owned.data ?? []), ...sharedDocuments]
  if (allDocuments.length === 0) return []

  const ownerIds = [
    ...new Set(allDocuments.map((document) => document.owner_id)),
  ]

  const [
    { data: owners, error: ownersError },
    { data: shareCounts, error: countError },
  ] = await Promise.all([
    db.from("users").select("*").in("id", ownerIds),
    db
      .from("document_shares")
      .select("document_id")
      .in(
        "document_id",
        allDocuments.map((document) => document.id),
      ),
  ])

  if (ownersError)
    throw new Error(`Failed to load owners: ${ownersError.message}`)
  if (countError)
    throw new Error(`Failed to count shares: ${countError.message}`)

  const ownerById = new Map((owners ?? []).map((user) => [user.id, user]))

  const shareCountByDocument = (shareCounts ?? []).reduce<Map<string, number>>(
    (counts, row) =>
      counts.set(row.document_id, (counts.get(row.document_id) ?? 0) + 1),
    new Map(),
  )

  return allDocuments
    .map((document) => {
      const owner = ownerById.get(document.owner_id)
      const access = resolveAccess({
        ownerId: document.owner_id,
        userId,
        shareRole: sharedRoleByDocument.get(document.id) ?? null,
      })

      return {
        id: document.id,
        title: document.title,
        preview: toPreview(document.content_text),
        updatedAt: document.updated_at,
        role: access.role ?? "viewer",
        owner: owner
          ? toSessionUser(owner)
          : { id: document.owner_id, name: "Unknown user", email: "" },
        sharedWithCount: shareCountByDocument.get(document.id) ?? 0,
      }
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export type CreateDocumentInput = {
  ownerId: string
  title?: string
  /** Raw HTML — sanitized here, so callers never have to remember to. */
  contentHtml?: string
}

export const createDocument = async ({
  ownerId,
  title,
  contentHtml = "",
}: CreateDocumentInput): Promise<DocumentRow> => {
  const safeHtml = sanitizeDocumentHtml(contentHtml)

  const { data, error } = await supabaseAdmin()
    .from("documents")
    .insert({
      owner_id: ownerId,
      title: title?.trim() || DEFAULT_TITLE,
      content_html: safeHtml,
      content_text: htmlToPlainText(safeHtml),
    })
    .select("*")
    .single()

  if (error) throw new Error(`Failed to create document: ${error.message}`)

  return data
}

export type UpdateDocumentFields = {
  title?: string
  contentHtml?: string
}

export const updateDocument = async (
  documentId: string,
  fields: UpdateDocumentFields,
): Promise<DocumentRow> => {
  // Typed against the table's Update shape rather than Record<string, string>,
  // so a typo in a column name fails to compile instead of at runtime.
  const patch: Database["public"]["Tables"]["documents"]["Update"] = {}

  if (fields.title !== undefined)
    patch.title = fields.title.trim() || DEFAULT_TITLE

  if (fields.contentHtml !== undefined) {
    const safeHtml = sanitizeDocumentHtml(fields.contentHtml)
    patch.content_html = safeHtml
    patch.content_text = htmlToPlainText(safeHtml)
  }

  const { data, error } = await supabaseAdmin()
    .from("documents")
    .update(patch)
    .eq("id", documentId)
    .select("*")
    .single()

  if (error) throw new Error(`Failed to update document: ${error.message}`)

  return data
}

export const deleteDocument = async (documentId: string): Promise<void> => {
  const { error } = await supabaseAdmin()
    .from("documents")
    .delete()
    .eq("id", documentId)

  if (error) throw new Error(`Failed to delete document: ${error.message}`)
}

export const listShares = async (documentId: string): Promise<ShareEntry[]> => {
  const db = supabaseAdmin()

  const { data: shares, error } = await db
    .from("document_shares")
    .select("user_id, role")
    .eq("document_id", documentId)
    .order("created_at", { ascending: true })

  if (error) throw new Error(`Failed to list shares: ${error.message}`)
  if (!shares || shares.length === 0) return []

  const { data: users, error: usersError } = await db
    .from("users")
    .select("*")
    .in(
      "id",
      shares.map((share) => share.user_id),
    )

  if (usersError)
    throw new Error(`Failed to load share users: ${usersError.message}`)

  const userById = new Map((users ?? []).map((user) => [user.id, user]))

  return shares.flatMap((share) => {
    const user = userById.get(share.user_id)
    if (!user) return []

    return [{ user: toSessionUser(user), role: share.role }]
  })
}

export const findUserByEmail = async (
  email: string,
): Promise<UserRow | null> => {
  const { data, error } = await supabaseAdmin()
    .from("users")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle()

  if (error) throw new Error(`Failed to look up user: ${error.message}`)

  return data ?? null
}

export const listUsers = async (): Promise<SessionUser[]> => {
  const { data, error } = await supabaseAdmin()
    .from("users")
    .select("*")
    .order("name", { ascending: true })

  if (error) throw new Error(`Failed to list users: ${error.message}`)

  return (data ?? []).map(toSessionUser)
}

/** Upserts on (document_id, user_id) so re-sharing changes the role instead of erroring. */
export const upsertShare = async (
  documentId: string,
  userId: string,
  role: ShareRole,
): Promise<void> => {
  const { error } = await supabaseAdmin()
    .from("document_shares")
    .upsert(
      { document_id: documentId, user_id: userId, role },
      { onConflict: "document_id,user_id" },
    )

  if (error) throw new Error(`Failed to share document: ${error.message}`)
}

export const removeShare = async (
  documentId: string,
  userId: string,
): Promise<void> => {
  const { error } = await supabaseAdmin()
    .from("document_shares")
    .delete()
    .eq("document_id", documentId)
    .eq("user_id", userId)

  if (error) throw new Error(`Failed to remove access: ${error.message}`)
}

export const listAttachments = async (
  documentId: string,
): Promise<AttachmentEntry[]> => {
  const db = supabaseAdmin()

  const { data: attachments, error } = await db
    .from("document_attachments")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })

  if (error) throw new Error(`Failed to list attachments: ${error.message}`)
  if (!attachments || attachments.length === 0) return []

  const { data: users, error: usersError } = await db
    .from("users")
    .select("*")
    .in("id", [
      ...new Set(attachments.map((attachment) => attachment.uploaded_by)),
    ])

  if (usersError)
    throw new Error(`Failed to load uploaders: ${usersError.message}`)

  const userById = new Map((users ?? []).map((user) => [user.id, user]))

  return attachments.map((attachment) => {
    const uploader = userById.get(attachment.uploaded_by)

    return {
      id: attachment.id,
      fileName: attachment.file_name,
      mimeType: attachment.mime_type,
      sizeBytes: attachment.size_bytes,
      createdAt: attachment.created_at,
      uploadedBy: uploader ? toSessionUser(uploader) : null,
    }
  })
}
