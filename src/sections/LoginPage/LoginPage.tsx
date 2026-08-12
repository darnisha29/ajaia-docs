"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { FileText } from "lucide-react"
import { toast } from "sonner"

import SeededUserButton from "@/sections/LoginPage/login/SeededUserButton"
import { ApiError, apiFetch } from "@/lib/apiClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { SessionUser } from "@/lib/types"

export type LoginPageProps = {
  users: SessionUser[]
}

const LoginPage = ({ users }: LoginPageProps) => {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  const signIn = async (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return

    setPendingEmail(trimmed)

    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: trimmed }),
      })

      // refresh() so the server components re-read the new session cookie;
      // push() alone can serve a cached logged-out tree.
      router.push("/documents")
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not sign in.",
      )
      setPendingEmail(null)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-[var(--radius)] bg-primary text-primary-foreground">
            <FileText className="size-5.5" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Ajaia Docs</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to create, edit, and share documents.
          </p>
        </div>

        <div className="rounded-[calc(var(--radius)*1.4)] border border-border bg-surface p-5 shadow-sm">
          <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Demo accounts
          </p>

          <div className="space-y-2">
            {users.map((user) => (
              <SeededUserButton
                key={user.id}
                user={user}
                pending={pendingEmail === user.email}
                disabled={pendingEmail !== null}
                onSelect={() => signIn(user.email)}
              />
            ))}
          </div>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or by email</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              signIn(email)
            }}
            className="flex gap-2"
          >
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ada@ajaia.test"
              aria-label="Email address"
              autoComplete="email"
            />
            <Button
              type="submit"
              disabled={pendingEmail !== null || !email.trim()}
            >
              Sign in
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Seeded accounts only — signing in does not create new users.
        </p>
      </div>
    </main>
  )
}

export default LoginPage
