import { notFound, redirect } from "next/navigation"

import DocumentEditor from "@/sections/DocumentEditor/DocumentEditor"
import { getCurrentUser } from "@/lib/session"
import { getDocumentAccess } from "@/lib/permissions"
import { listAttachments, listShares } from "@/lib/documents"
import { supabaseAdmin } from "@/lib/supabase"
import type { DocumentDetail, SessionUser } from "@/lib/types"

export const dynamic = "force-dynamic"

type PageProps = { params: Promise<{ id: string }> }

const Page = async ({ params }: PageProps) => {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const { id } = await params
  const result = await getDocumentAccess(id, user.id)

  // Same reasoning as the API: a document the user can't see is indistinguishable
  // from one that doesn't exist.
  if (!result || !result.access.canView) notFound()

  const { document, access } = result

  const [shares, attachments, ownerResult] = await Promise.all([
    listShares(document.id),
    listAttachments(document.id),
    supabaseAdmin()
      .from("users")
      .select("*")
      .eq("id", document.owner_id)
      .maybeSingle(),
  ])

  const ownerRow = ownerResult.data
  const owner: SessionUser = ownerRow
    ? { id: ownerRow.id, email: ownerRow.email, name: ownerRow.name }
    : { id: document.owner_id, email: "", name: "Unknown user" }

  const detail: DocumentDetail = {
    id: document.id,
    title: document.title,
    contentHtml: document.content_html,
    updatedAt: document.updated_at,
    owner,
    role: access.role ?? "viewer",
    canEdit: access.canEdit,
    canManageSharing: access.canManageSharing,
    shares,
    attachments,
  }

  return (
    <DocumentEditor
      user={user}
      document={detail}
    />
  )
}

export default Page
