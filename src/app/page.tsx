import { redirect } from "next/navigation"

import { getSessionUserId } from "@/lib/session"

const Page = async () => {
  const userId = await getSessionUserId()

  redirect(userId ? "/documents" : "/login")
}

export default Page
