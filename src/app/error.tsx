"use client"

import { useEffect } from "react"

export type ErrorPageProps = {
  error: Error & { digest?: string }
  reset: () => void
}

const ErrorPage = ({ error, reset }: ErrorPageProps) => {
  useEffect(() => {
    console.error(error)
  }, [error])

  // The most likely failure on a fresh clone is a missing Supabase env var, and
  // a generic "something went wrong" sends people hunting through server logs.
  const isConfigError = error.message.includes("SUPABASE")

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        {isConfigError ? "Setup incomplete" : "Something went wrong"}
      </h1>

      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {isConfigError ? (
          <>
            The app can&apos;t reach its database. Copy{" "}
            <code className="rounded bg-muted px-1 py-0.5">.env.example</code>{" "}
            to <code className="rounded bg-muted px-1 py-0.5">.env.local</code>,
            fill in your Supabase URL and service-role key, then restart the dev
            server. See the README for the full setup.
          </>
        ) : (
          "An unexpected error occurred. Try again, and check the server logs if it persists."
        )}
      </p>

      <button
        type="button"
        onClick={reset}
        className="mt-6 cursor-pointer rounded-[var(--radius)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Try again
      </button>
    </main>
  )
}

export default ErrorPage
