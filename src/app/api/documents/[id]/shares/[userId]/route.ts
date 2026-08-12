import { NextResponse, type NextRequest } from "next/server"

import { removeShare, upsertShare } from "@/lib/documents"
import { getCurrentUser } from "@/lib/session"
import { getDocumentAccess } from "@/lib/permissions"
import { updateShareSchema } from "@/lib/validation"
import {
  forbidden,
  handleRouteError,
  notFound,
  unauthorized,
} from "@/lib/apiError"

type RouteContext = { params: Promise<{ id: string; userId: string }> }

export const PATCH = async (request: NextRequest, { params }: RouteContext) => {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const { id, userId } = await params
    const result = await getDocumentAccess(id, user.id)

    if (!result || !result.access.canView)
      return notFound("Document not found.")
    if (!result.access.canManageSharing) {
      return forbidden("Only the owner can change access.")
    }

    const { role } = updateShareSchema.parse(await request.json())

    await upsertShare(id, userId, role)

    return NextResponse.json({ ok: true })
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

    const { id, userId } = await params
    const result = await getDocumentAccess(id, user.id)

    if (!result || !result.access.canView)
      return notFound("Document not found.")

    // The owner can revoke anyone; a grantee can always remove themselves.
    const isSelfRemoval = userId === user.id

    if (!result.access.canManageSharing && !isSelfRemoval) {
      return forbidden("Only the owner can change access.")
    }

    await removeShare(id, userId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleRouteError(error)
  }
}
