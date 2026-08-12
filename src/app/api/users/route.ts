import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/session"
import { handleRouteError, unauthorized } from "@/lib/apiError"
import { listUsers } from "@/lib/documents"

/**
 * Powers the share dialog's recipient picker. Auth-gated: the seeded roster is
 * small and harmless, but an open user-directory endpoint is a habit worth not
 * forming.
 */
export const GET = async () => {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    return NextResponse.json({ users: await listUsers() })
  } catch (error) {
    return handleRouteError(error)
  }
}
