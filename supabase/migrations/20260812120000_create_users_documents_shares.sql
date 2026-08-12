-- Ajaia Docs — initial schema.
--
-- Four tables: users (seeded, no password — see ARCHITECTURE.md for why auth is
-- deliberately lightweight in this exercise), documents, document_shares, and
-- document_attachments.
--
-- RLS is enabled with no policies on every table. All server access goes through
-- the service-role client (src/lib/supabase.ts), which bypasses RLS; authorization
-- is enforced in app code (src/lib/permissions.ts). RLS-on + no-policies means a
-- leaked anon key still reads nothing.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- users
-- ─────────────────────────────────────────────────────────────
create table public.users (
  id         uuid primary key default gen_random_uuid(),
  email      text        not null unique,
  name       text        not null,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- ─────────────────────────────────────────────────────────────
-- documents
-- ─────────────────────────────────────────────────────────────
create table public.documents (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid        not null references public.users (id) on delete cascade,
  title        text        not null default 'Untitled document',
  -- Sanitized HTML produced by the Tiptap editor or a file import. Always run
  -- through src/lib/sanitize.ts before it lands here.
  content_html text        not null default '',
  -- Flattened text, kept in sync on write. Powers list previews without
  -- shipping full HTML to the documents list.
  content_text text        not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index documents_owner_id_idx on public.documents (owner_id);
create index documents_updated_at_idx on public.documents (updated_at desc);

alter table public.documents enable row level security;

-- ─────────────────────────────────────────────────────────────
-- document_shares
-- ─────────────────────────────────────────────────────────────
-- One row per (document, grantee). The owner is NOT represented here — ownership
-- lives on documents.owner_id, so a document always has exactly one owner and
-- ownership can never be revoked by deleting a share row.
create table public.document_shares (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid        not null references public.documents (id) on delete cascade,
  user_id     uuid        not null references public.users (id) on delete cascade,
  role        text        not null check (role in ('viewer', 'editor')),
  created_at  timestamptz not null default now(),
  unique (document_id, user_id)
);

create index document_shares_user_id_idx on public.document_shares (user_id);
create index document_shares_document_id_idx on public.document_shares (document_id);

alter table public.document_shares enable row level security;

-- ─────────────────────────────────────────────────────────────
-- document_attachments
-- ─────────────────────────────────────────────────────────────
-- Files attached to a document. The bytes live in Supabase Storage; this table
-- holds the metadata plus the storage path used to mint signed download URLs.
create table public.document_attachments (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid        not null references public.documents (id) on delete cascade,
  uploaded_by  uuid        not null references public.users (id) on delete cascade,
  file_name    text        not null,
  mime_type    text        not null,
  size_bytes   integer     not null check (size_bytes >= 0),
  storage_path text        not null,
  created_at   timestamptz not null default now()
);

create index document_attachments_document_id_idx on public.document_attachments (document_id);

alter table public.document_attachments enable row level security;

-- ─────────────────────────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────────────────────────
-- Autosave writes land often; keeping updated_at in a trigger means every write
-- path gets it right without remembering to set it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger documents_set_updated_at
  before update on public.documents
  for each row
  execute function public.set_updated_at();
