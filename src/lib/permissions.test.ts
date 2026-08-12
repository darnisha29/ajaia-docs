import { describe, expect, it } from "vitest"

import { resolveAccess } from "@/lib/permissions"

// The sharing rules are the part of this app most likely to be wrong in a way
// that matters — a mistake here leaks or destroys someone else's document. They
// live in one pure function precisely so they can be pinned down here.

const OWNER = "11111111-1111-4111-8111-111111111111"
const OTHER = "22222222-2222-4222-8222-222222222222"

describe("resolveAccess", () => {
  it("gives the owner full control", () => {
    expect(
      resolveAccess({ ownerId: OWNER, userId: OWNER, shareRole: null }),
    ).toEqual({
      role: "owner",
      canView: true,
      canEdit: true,
      canManageSharing: true,
      canDelete: true,
    })
  })

  it("lets an editor write but not re-share or delete", () => {
    const access = resolveAccess({
      ownerId: OWNER,
      userId: OTHER,
      shareRole: "editor",
    })

    expect(access.role).toBe("editor")
    expect(access.canView).toBe(true)
    expect(access.canEdit).toBe(true)
    expect(access.canManageSharing).toBe(false)
    expect(access.canDelete).toBe(false)
  })

  it("lets a viewer read but not write", () => {
    const access = resolveAccess({
      ownerId: OWNER,
      userId: OTHER,
      shareRole: "viewer",
    })

    expect(access.role).toBe("viewer")
    expect(access.canView).toBe(true)
    expect(access.canEdit).toBe(false)
    expect(access.canManageSharing).toBe(false)
    expect(access.canDelete).toBe(false)
  })

  it("denies everything to a user with no share row", () => {
    const access = resolveAccess({
      ownerId: OWNER,
      userId: OTHER,
      shareRole: null,
    })

    expect(access.role).toBeNull()
    expect(access.canView).toBe(false)
    expect(access.canEdit).toBe(false)
    expect(access.canManageSharing).toBe(false)
    expect(access.canDelete).toBe(false)
  })

  it("denies everything to a signed-out caller, even on their own document", () => {
    const access = resolveAccess({
      ownerId: OWNER,
      userId: null,
      shareRole: "editor",
    })

    expect(access.canView).toBe(false)
    expect(access.canEdit).toBe(false)
  })

  it("keeps owner rights when the owner also has a viewer share row", () => {
    // Guards against a downgrade bug: if a stale share row ever named the owner,
    // ownership must still win rather than locking them out of their own document.
    const access = resolveAccess({
      ownerId: OWNER,
      userId: OWNER,
      shareRole: "viewer",
    })

    expect(access.role).toBe("owner")
    expect(access.canEdit).toBe(true)
    expect(access.canManageSharing).toBe(true)
  })
})
