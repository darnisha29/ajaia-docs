import { NextResponse, type NextRequest } from "next/server"

import { deleteDocument, updateDocument } from "@/lib/documents"
import { getCurrentUser } from "@/lib/session"
import { getDocumentAccess } from "@/lib/permissions"
import { updateDocumentSchema } from "@/lib/validation"
import {
  forbidden,
  handleRouteError,
  notFound,
  unauthorized,
} from "@/lib/apiError"

type RouteContext = { params: Promise<{ id: string }> }

export const GET = async (_request: NextRequest, { params }: RouteContext) => {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { id } = await params
    const result = await getDocumentAccess(id, user.id)

    // No-access is reported as 404, not 403: a 403 would confirm the document
    // exists to someone who was never granted it.
    if (!result || !result.access.canView)
      return notFound("Document not found.")

    return NextResponse.json({
      id: result.document.id,
      title: result.document.title,
      contentHtml: result.document.content_html,
      updatedAt: result.document.updated_at,
      role: result.access.role,
      canEdit: result.access.canEdit,
    })
  } catch (error) {
    return handleRouteError(error)
  }
}

export const PATCH = async (request: NextRequest, { params }: RouteContext) => {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { id } = await params
    const result = await getDocumentAccess(id, user.id)

    if (!result || !result.access.canView)
      return notFound("Document not found.")
    if (!result.access.canEdit) {
      return forbidden("You have view-only access to this document.")
    }

    const payload = updateDocumentSchema.parse(await request.json())

    const document = await updateDocument(id, {
      title: payload.title,
      contentHtml: payload.contentHtml,
    })

    return NextResponse.json({
      id: document.id,
      title: document.title,
      updatedAt: document.updated_at,
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

    const { id } = await params
    const result = await getDocumentAccess(id, user.id)

    if (!result || !result.access.canView)
      return notFound("Document not found.")
    if (!result.access.canDelete) {
      return forbidden("Only the owner can delete this document.")
    }

    await deleteDocument(id)

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleRouteError(error)
  }
}
