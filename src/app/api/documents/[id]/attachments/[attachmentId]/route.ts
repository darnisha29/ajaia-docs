import { NextResponse, type NextRequest } from "next/server"

import { getCurrentUser } from "@/lib/session"
import { getDocumentAccess } from "@/lib/permissions"
import { ATTACHMENTS_BUCKET, supabaseAdmin } from "@/lib/supabase"
import {
  forbidden,
  handleRouteError,
  notFound,
  unauthorized,
} from "@/lib/apiError"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ id: string; attachmentId: string }> }

const SIGNED_URL_TTL_SECONDS = 60

/**
 * Mints a short-lived signed URL for the blob. The bucket is private, so this
 * route — after a permission check — is the only way to reach an attachment.
 */
export const GET = async (_request: NextRequest, { params }: RouteContext) => {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { id, attachmentId } = await params
    const result = await getDocumentAccess(id, user.id)

    if (!result || !result.access.canView)
      return notFound("Document not found.")

    const db = supabaseAdmin()

    // Scope by document_id too: an attachment id from another document must not
    // be downloadable by pairing it with a document the caller can read.
    const { data: attachment, error } = await db
      .from("document_attachments")
      .select("*")
      .eq("id", attachmentId)
      .eq("document_id", id)
      .maybeSingle()

    if (error) throw new Error(`Failed to load attachment: ${error.message}`)
    if (!attachment) return notFound("Attachment not found.")

    const { data: signed, error: signError } = await db.storage
      .from(ATTACHMENTS_BUCKET)
      .createSignedUrl(attachment.storage_path, SIGNED_URL_TTL_SECONDS, {
        download: attachment.file_name,
      })

    if (signError || !signed) {
      throw new Error(`Failed to sign attachment URL: ${signError?.message}`)
    }

    return NextResponse.json({
      url: signed.signedUrl,
      fileName: attachment.file_name,
    })
  } catch (error) {
    return handleRouteError(error)
  }
}

export const DELETE = async (
  _request: NextRequest,
  { params }: RouteContext,
) => {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { id, attachmentId } = await params
    const result = await getDocumentAccess(id, user.id)

    if (!result || !result.access.canView)
      return notFound("Document not found.")
    if (!result.access.canEdit) {
      return forbidden("You have view-only access to this document.")
    }

    const db = supabaseAdmin()

    const { data: attachment, error } = await db
      .from("document_attachments")
      .select("*")
      .eq("id", attachmentId)
      .eq("document_id", id)
      .maybeSingle()

    if (error) throw new Error(`Failed to load attachment: ${error.message}`)
    if (!attachment) return notFound("Attachment not found.")

    await db.storage.from(ATTACHMENTS_BUCKET).remove([attachment.storage_path])

    const { error: deleteError } = await db
      .from("document_attachments")
      .delete()
      .eq("id", attachmentId)

    if (deleteError) {
      throw new Error(`Failed to delete attachment: ${deleteError.message}`)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleRouteError(error)
  }
}
