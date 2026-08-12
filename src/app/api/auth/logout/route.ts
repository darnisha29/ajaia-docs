import { NextResponse } from "next/server"

import { clearSessionCookie } from "@/lib/session"
import { handleRouteError } from "@/lib/apiError"

export const POST = async () => {
  try {
    await clearSessionCookie()
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleRouteError(error)
  }
}
