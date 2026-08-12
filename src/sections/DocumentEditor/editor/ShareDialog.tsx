"use client"

import { useState } from "react"
import { toast } from "sonner"

import ShareRow from "@/sections/DocumentEditor/editor/ShareRow"
import { ApiError, apiFetch } from "@/lib/apiClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import type { SessionUser, ShareEntry } from "@/lib/types"
import type { ShareRole } from "@/lib/database.types"

export type ShareDialogProps = {
  open: boolean
  onClose: () => void
  documentId: string
  owner: SessionUser
  shares: ShareEntry[]
  onSharesChange: (shares: ShareEntry[]) => void
}

const ShareDialog = ({
  open,
  onClose,
  documentId,
  owner,
  shares,
  onSharesChange,
}: ShareDialogProps) => {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<ShareRole>("editor")
  const [busy, setBusy] = useState(false)

  // Re-reads the list from the server after every mutation rather than patching
  // local state, so the dialog can't drift from what the database actually holds.
  const refreshShares = async () => {
    const { shares: next } = await apiFetch<{ shares: ShareEntry[] }>(
      `/api/documents/${documentId}/shares`,
    )
    onSharesChange(next)
  }

  const withBusy = async (action: () => Promise<void>, fallback: string) => {
    setBusy(true)

    try {
      await action()
      await refreshShares()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : fallback)
    } finally {
      setBusy(false)
    }
  }

  const addShare = (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim()) return

    withBusy(async () => {
      await apiFetch(`/api/documents/${documentId}/shares`, {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), role }),
      })

      toast.success(`Shared with ${email.trim()}.`)
      setEmail("")
    }, "Could not share this document.")
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Share document"
      description="Grant another seeded account access to this document."
    >
      <form
        onSubmit={addShare}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="grace@ajaia.test"
          aria-label="Email address to share with"
          disabled={busy}
        />

        <select
          value={role}
          onChange={(event) => setRole(event.target.value as ShareRole)}
          aria-label="Access level"
          disabled={busy}
          className="h-9.5 shrink-0 cursor-pointer rounded-[var(--radius)] border border-border bg-surface px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
        >
          <option value="editor">Can edit</option>
          <option value="viewer">Can view</option>
        </select>

        <Button
          type="submit"
          disabled={busy || !email.trim()}
        >
          Share
        </Button>
      </form>

      <div className="mt-5">
        <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          People with access
        </p>

        <ul className="divide-y divide-border">
          <li className="flex items-center gap-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{owner.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {owner.email}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">Owner</span>
          </li>

          {shares.map((share) => (
            <ShareRow
              key={share.user.id}
              share={share}
              busy={busy}
              onRoleChange={(nextRole) =>
                withBusy(async () => {
                  await apiFetch(
                    `/api/documents/${documentId}/shares/${share.user.id}`,
                    {
                      method: "PATCH",
                      body: JSON.stringify({ role: nextRole }),
                    },
                  )
                }, "Could not update access.")
              }
              onRemove={() =>
                withBusy(async () => {
                  await apiFetch(
                    `/api/documents/${documentId}/shares/${share.user.id}`,
                    { method: "DELETE" },
                  )
                  toast.success("Access removed.")
                }, "Could not remove access.")
              }
            />
          ))}
        </ul>

        {shares.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">
            Not shared with anyone yet.
          </p>
        ) : null}
      </div>
    </Modal>
  )
}

export default ShareDialog
