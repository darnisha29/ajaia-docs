import { NextResponse, type NextRequest } from "next/server"

import { findUserByEmail } from "@/lib/documents"
import { handleRouteError, jsonError } from "@/lib/apiError"
import { loginSchema } from "@/lib/validation"
import { setSessionCookie } from "@/lib/session"

export const POST = async (request: NextRequest) => {
  try {
    const { email } = loginSchema.parse(await request.json())

    const user = await findUserByEmail(email)

    // Sign-in never creates users — the seeded accounts are the whole roster.
    if (!user) {
      return jsonError(
        "No seeded account with that email. Try ada@ajaia.test, grace@ajaia.test, or alan@ajaia.test.",
        401,
      )
    }

    await setSessionCookie(user.id)

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
