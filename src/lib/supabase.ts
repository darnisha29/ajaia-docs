import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"

// Server-only admin client. The service-role key bypasses Row-Level Security,
// so NEVER import this into a client component — it must stay on the server
// (route handlers, server actions, server components). Authorization is handled
// in app code via @/lib/permissions, not Supabase RLS.
//
// Created lazily via a singleton so a missing env at build time doesn't throw,
// and so hot reloads in dev reuse one client.
let client: SupabaseClient<Database> | undefined

export const supabaseAdmin = (): SupabaseClient<Database> => {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var",
    )
  }

  client = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return client
}

export const ATTACHMENTS_BUCKET = "document-attachments"
