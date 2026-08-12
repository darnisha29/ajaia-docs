import { NextResponse, type NextRequest } from "next/server"

import { findUserByEmail, listShares, upsertShare } from "@/lib/documents"
import { createShareSchema } from "@/lib/validation"
import { getCurrentUser } from "@/lib/session"
import { getDocumentAccess } from "@/lib/permissions"
import {
  badRequest,
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

    if (!result || !result.access.canView)
      return notFound("Document not found.")

    return NextResponse.json({ shares: await listShares(id) })
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

    // Only the owner grants access. Editors can change content but cannot widen
    // the audience — that keeps the sharing graph one level deep and auditable.
    if (!result.access.canManageSharing) {
      return forbidden("Only the owner can share this document.")
    }

    const { email, role } = createShareSchema.parse(await request.json())

    const grantee = await findUserByEmail(email)
    if (!grantee) {
      return badRequest("No account with that email. Pick a seeded user.")
    }

    if (grantee.id === result.document.owner_id) {
      return badRequest("That user already owns this document.")
    }

    await upsertShare(id, grantee.id, role)

    return NextResponse.json(
      {
        share: {
          user: { id: grantee.id, name: grantee.name, email: grantee.email },
          role,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    return handleRouteError(error)
  }
}
