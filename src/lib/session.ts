import { cookies } from "next/headers"

import { supabaseAdmin } from "@/lib/supabase"
import {
  createSessionToken,
  readSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/sessionToken"
import type { UserRow } from "@/lib/database.types"

// Cookie and database I/O for the session. The signing rules live in
// @/lib/sessionToken.

export const setSessionCookie = async (userId: string): Promise<void> => {
  const store = await cookies()

  store.set(SESSION_COOKIE_NAME, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export const clearSessionCookie = async (): Promise<void> => {
  const store = await cookies()
  store.delete(SESSION_COOKIE_NAME)
}

export const getSessionUserId = async (): Promise<string | null> => {
  const store = await cookies()
  return readSessionToken(store.get(SESSION_COOKIE_NAME)?.value)
}

/**
 * Resolves the signed-in user, or null. The signature proves the id was issued
 * by us; this still re-reads the row so a deleted user can't keep a live session.
 */
export const getCurrentUser = async (): Promise<UserRow | null> => {
  const userId = await getSessionUserId()
  if (!userId) return null

  const { data, error } = await supabaseAdmin()
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle()

  if (error) throw new Error(`Failed to load session user: ${error.message}`)

  return data ?? null
}
