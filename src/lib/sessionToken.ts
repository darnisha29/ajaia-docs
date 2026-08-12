import { createHmac, timingSafeEqual } from "node:crypto"

// Pure token signing/verification, deliberately split from @/lib/session (which
// owns cookie and database I/O) so the security-critical half can be unit-tested
// without a request context.

export const SESSION_COOKIE_NAME = "ajaia_session"
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export const sessionSecret = (): string => {
  const secret = process.env.SESSION_SECRET

  if (secret) return secret

  // Fail loudly in production; stay frictionless for `yarn dev` without a .env.
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production")
  }

  return "dev-only-insecure-session-secret"
}

const sign = (value: string): string =>
  createHmac("sha256", sessionSecret()).update(value).digest("hex")

const isValidSignature = (value: string, signature: string): boolean => {
  const expected = Buffer.from(sign(value), "utf8")
  const received = Buffer.from(signature, "utf8")

  // timingSafeEqual throws on a length mismatch, so compare lengths first.
  if (expected.length !== received.length) return false

  return timingSafeEqual(expected, received)
}

/**
 * Builds the cookie payload: "<userId>.<hmac>".
 *
 * There are no passwords in this app — the seeded accounts are demo identities.
 * The signature is what stops the cookie being hand-edited to another user's id,
 * so impersonation requires the server secret rather than a devtools session.
 */
export const createSessionToken = (userId: string): string =>
  `${userId}.${sign(userId)}`

/**
 * Parses a token back to a user id, or null when it is missing, malformed, or
 * has been tampered with.
 */
export const readSessionToken = (token: string | undefined): string | null => {
  if (!token) return null

  // lastIndexOf, not split: a user id could itself contain a dot, and only the
  // final segment is the signature.
  const separator = token.lastIndexOf(".")
  if (separator <= 0) return null

  const userId = token.slice(0, separator)
  const signature = token.slice(separator + 1)

  if (!userId || !signature) return null
  if (!isValidSignature(userId, signature)) return null

  return userId
}
