"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { FileText, LogOut } from "lucide-react"
import { toast } from "sonner"

import { apiFetch } from "@/lib/apiClient"
import type { SessionUser } from "@/lib/types"

export type AppHeaderProps = {
  user: SessionUser
  children?: React.ReactNode
}

const AppHeader = ({ user, children }: AppHeaderProps) => {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  const signOut = async () => {
    setSigningOut(true)

    try {
      await apiFetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
      router.refresh()
    } catch {
      toast.error("Could not sign out.")
      setSigningOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link
          href="/documents"
          className="flex shrink-0 items-center gap-2 font-semibold tracking-tight"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <FileText className="size-4" />
          </span>
          <span className="hidden sm:inline">Ajaia Docs</span>
        </Link>

        {/* Editor slots the title + save status in here. */}
        <div className="min-w-0 flex-1">{children}</div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {user.name}
          </span>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            aria-label="Sign out"
            title="Sign out"
            className="cursor-pointer rounded-[var(--radius)] p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </header>
  )
}

export default AppHeader
