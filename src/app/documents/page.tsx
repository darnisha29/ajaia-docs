import { redirect } from "next/navigation"

import DocumentsPage from "@/sections/DocumentsPage/DocumentsPage"
import { getCurrentUser } from "@/lib/session"
import { listDocumentsForUser } from "@/lib/documents"

// The document list reflects writes made moments ago (rename, import, delete),
// so it must never be served from the full route cache.
export const dynamic = "force-dynamic"

const Page = async () => {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const documents = await listDocumentsForUser(user.id)

  return (
    <DocumentsPage
      user={user}
      documents={documents}
    />
  )
}

export default Page
