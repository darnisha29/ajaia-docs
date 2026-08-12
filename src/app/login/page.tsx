import { redirect } from "next/navigation"

import LoginPage from "@/sections/LoginPage/LoginPage"
import { getSessionUserId } from "@/lib/session"
import { listUsers } from "@/lib/documents"

const Page = async () => {
  if (await getSessionUserId()) redirect("/documents")

  // The roster is rendered as one-click sign-in buttons so a reviewer can switch
  // identities to test sharing without knowing the seeded emails.
  const users = await listUsers()

  return <LoginPage users={users} />
}

export default Page
