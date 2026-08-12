import { NextResponse, type NextRequest } from "next/server"

import { listAttachments } from "@/lib/documents"
import { getCurrentUser } from "@/lib/session"
import { getDocumentAccess } from "@/lib/permissions"
import { ATTACHMENTS_BUCKET, supabaseAdmin } from "@/lib/supabase"
import {
  badRequest,
  forbidden,
  handleRouteError,
  notFound,
  unauthorized,
} from "@/lib/apiError"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ id: string }> }

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

/**
 * Storage keys are namespaced by document and prefixed with a random id so two
 * uploads of "notes.pdf" don't collide, and so the key can't be guessed from the
 * document id alone.
 */
const buildStoragePath = (documentId: string, fileName: string): string => {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100)
  return `${documentId}/${crypto.randomUUID()}-${safeName}`
}

export const GET = async (_request: NextRequest, { params }: RouteContext) => {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { id } = await params
    const result = await getDocumentAccess(id, user.id)

    if (!result || !result.access.canView)
      return notFound("Document not found.")

    return NextResponse.json({ attachments: await listAttachments(id) })
  } catch (error) {
    return handleRouteError(error)
  }
}

export const POST = async (request: NextRequest, { params }: RouteContext) => {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { id } = await params
    const result = await getDocumentAccess(id, user.id)

    if (!result || !result.access.canView)
      return notFound("Document not found.")

    // Attaching a file changes the document, so it needs write access — viewers
    // can read attachments but not add them.
    if (!result.access.canEdit) {
      return forbidden("You have view-only access to this document.")
    }

    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) return badRequest("Choose a file to attach.")
    if (file.size === 0) return badRequest("That file is empty.")

    if (file.size > MAX_ATTACHMENT_BYTES) {
      return badRequest(
        `File is too large. Maximum attachment size is ${MAX_ATTACHMENT_BYTES / 1024 / 1024}MB.`,
      )
    }

    const db = supabaseAdmin()
    const storagePath = buildStoragePath(id, file.name)

    const { error: uploadError } = await db.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(storagePath, await file.arrayBuffer(), {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Failed to upload attachment: ${uploadError.message}`)
    }

    const { data, error } = await db
      .from("document_attachments")
      .insert({
        document_id: id,
        uploaded_by: user.id,
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        storage_path: storagePath,
      })
      .select("*")
      .single()

    if (error) {
      // Don't leave the blob orphaned if the metadata insert fails.
      await db.storage.from(ATTACHMENTS_BUCKET).remove([storagePath])
      throw new Error(`Failed to record attachment: ${error.message}`)
    }

    return NextResponse.json(
      {
        attachment: {
          id: data.id,
          fileName: data.file_name,
          mimeType: data.mime_type,
          sizeBytes: data.size_bytes,
          createdAt: data.created_at,
          uploadedBy: { id: user.id, name: user.name, email: user.email },
        },
      },
      { status: 201 },
    )
  } catch (error) {
    return handleRouteError(error)
  }
}
