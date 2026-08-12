import { NextResponse } from "next/server"
import { ZodError } from "zod"

export type ApiErrorBody = { error: string; details?: unknown }

export const jsonError = (message: string, status: number) =>
  NextResponse.json<ApiErrorBody>({ error: message }, { status })

export const unauthorized = () => jsonError("You must be signed in.", 401)

export const forbidden = (message = "You do not have access to do that.") =>
  jsonError(message, 403)

/**
 * Used for documents the caller may not view as well as ones that don't exist,
 * so document ids can't be enumerated by probing for 403s.
 */
export const notFound = (message = "Not found.") => jsonError(message, 404)

export const badRequest = (message: string, details?: unknown) =>
  NextResponse.json<ApiErrorBody>({ error: message, details }, { status: 400 })

/**
 * Single catch-all for route handlers: Zod failures become 400s with field
 * details, everything else becomes a 500 with the detail logged rather than
 * leaked to the client.
 */
export const handleRouteError = (error: unknown) => {
  if (error instanceof ZodError) {
    return badRequest("Invalid request.", error.flatten().fieldErrors)
  }

  console.error("[api]", error)

  return jsonError("Something went wrong. Please try again.", 500)
}
