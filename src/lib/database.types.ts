// Hand-maintained to match supabase/migrations/*.sql.
// When you add a migration, update this file in the same commit.
//
// Shape note: `Relationships` is not decoration — @supabase/supabase-js requires
// it on every table for the schema to satisfy its `GenericSchema` constraint.
// Omit it and TypeScript silently resolves every query result to `never` rather
// than reporting a mismatch, so keep the entries in sync with the real foreign
// keys declared in migration 0001.

export type ShareRole = "viewer" | "editor"

export type UserRow = {
  id: string
  email: string
  name: string
  created_at: string
}

export type DocumentRow = {
  id: string
  owner_id: string
  title: string
  content_html: string
  content_text: string
  created_at: string
  updated_at: string
}

export type DocumentShareRow = {
  id: string
  document_id: string
  user_id: string
  role: ShareRole
  created_at: string
}

export type DocumentAttachmentRow = {
  id: string
  document_id: string
  uploaded_by: string
  file_name: string
  mime_type: string
  size_bytes: number
  storage_path: string
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: UserRow
        Insert: Omit<UserRow, "id" | "created_at"> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<UserRow, "id">>
        Relationships: []
      }
      documents: {
        Row: DocumentRow
        Insert: Omit<DocumentRow, "id" | "created_at" | "updated_at"> & {
          id?: string
          title?: string
          content_html?: string
          content_text?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<DocumentRow, "id" | "owner_id" | "created_at">>
        Relationships: [
          {
            foreignKeyName: "documents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      document_shares: {
        Row: DocumentShareRow
        Insert: Omit<DocumentShareRow, "id" | "created_at"> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Pick<DocumentShareRow, "role">>
        Relationships: [
          {
            foreignKeyName: "document_shares_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      document_attachments: {
        Row: DocumentAttachmentRow
        Insert: Omit<DocumentAttachmentRow, "id" | "created_at"> & {
          id?: string
          created_at?: string
        }
        // Attachments are immutable in the app (upload or delete, never edit),
        // but the client's schema constraint requires an object type here.
        Update: Partial<Omit<DocumentAttachmentRow, "id">>
        Relationships: [
          {
            foreignKeyName: "document_attachments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
