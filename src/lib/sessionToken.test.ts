import { beforeAll, describe, expect, it } from "vitest"

import { createSessionToken, readSessionToken } from "@/lib/sessionToken"

// The session cookie is the only thing standing between one demo account and
// another's private documents. If a token can be forged, the whole sharing model
// is decorative — so the tamper cases are pinned down here.

const USER_A = "11111111-1111-4111-8111-111111111111"
const USER_B = "22222222-2222-4222-8222-222222222222"

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret"
})

describe("session tokens", () => {
  it("round-trips a user id", () => {
    expect(readSessionToken(createSessionToken(USER_A))).toBe(USER_A)
  })

  it("rejects a token whose user id was swapped for someone else's", () => {
    const forged = `${USER_B}.${createSessionToken(USER_A).split(".")[1]}`

    expect(readSessionToken(forged)).toBeNull()
  })

  it("rejects an unsigned bare user id", () => {
    expect(readSessionToken(USER_A)).toBeNull()
  })

  it("rejects a tampered signature", () => {
    const token = createSessionToken(USER_A)

    expect(readSessionToken(`${token}0`)).toBeNull()
  })

  it("rejects missing, empty, and malformed tokens", () => {
    expect(readSessionToken(undefined)).toBeNull()
    expect(readSessionToken("")).toBeNull()
    expect(readSessionToken(".")).toBeNull()
    expect(readSessionToken(`.${"a".repeat(64)}`)).toBeNull()
    expect(readSessionToken(`${USER_A}.`)).toBeNull()
  })

  it("rejects a token signed with a different secret", () => {
    const token = createSessionToken(USER_A)

    process.env.SESSION_SECRET = "a-different-secret"
    const result = readSessionToken(token)
    process.env.SESSION_SECRET = "test-secret"

    expect(result).toBeNull()
  })
})
