import Link from "next/link"

const NotFound = () => (
  <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
    <h1 className="text-2xl font-semibold tracking-tight">
      Document not found
    </h1>
    <p className="mt-2 max-w-sm text-sm text-muted-foreground">
      It may have been deleted, or you may not have access to it. Ask the owner
      to share it with you.
    </p>
    <Link
      href="/documents"
      className="mt-6 rounded-[var(--radius)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
    >
      Back to documents
    </Link>
  </main>
)

export default NotFound
