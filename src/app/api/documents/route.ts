import { NextResponse, type NextRequest } from "next/server"

import { createDocument, listDocumentsForUser } from "@/lib/documents"
import { createDocumentSchema } from "@/lib/validation"
import { getCurrentUser } from "@/lib/session"
import { handleRouteError, unauthorized } from "@/lib/apiError"

export const GET = async () => {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    return NextResponse.json({ documents: await listDocumentsForUser(user.id) })
  } catch (error) {
    return handleRouteError(error)
  }
}

export const POST = async (request: NextRequest) => {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    // "New document" sends no body at all; treat that as an empty payload
    // rather than a parse failure.
    const raw = await request.text()
    const { title } = createDocumentSchema.parse(raw ? JSON.parse(raw) : {})

    const document = await createDocument({ ownerId: user.id, title })

    return NextResponse.json(
      { id: document.id, title: document.title },
      { status: 201 },
    )
  } catch (error) {
    return handleRouteError(error)
  }
}
