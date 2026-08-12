# Submission contents

**Project:** Ajaia Docs — a lightweight collaborative document editor
**Live URL:** _<!-- paste the deployed Vercel URL here -->_
**Walkthrough video:** see `WALKTHROUGH.txt`

---

## For reviewers — start here

**No signup required.** Open the live URL and click any of the three seeded accounts.

| Name         | Email              |
| ------------ | ------------------ |
| Ada Lovelace | `ada@ajaia.test`   |
| Grace Hopper | `grace@ajaia.test` |
| Alan Turing  | `alan@ajaia.test`  |

There are no passwords — sign-in is a one-click user picker, so switching identities to test sharing
takes a few seconds. These are the only accounts that exist; signing in does not create new users.

**To see the sharing model in ~60 seconds:**

1. Sign in as **Ada** → create a document → type and format something.
2. **Share** → `grace@ajaia.test` → **Can edit** → Share.
3. Sign out (top right) → sign in as **Grace**.
4. The document is under **Shared with me** and is editable. Ada's other documents are invisible.
5. Switch Grace to **Can view** → the toolbar disables and a "View only" badge appears.

**Import formats: `.txt`, `.md`, `.docx` only** (≤5MB). Attachments accept any type (≤10MB).

Running locally instead? See [`README.md`](README.md) — it needs a Supabase project and three env
variables.

---

## Documents

| File                          | What it is                                                              |
| ----------------------------- | ----------------------------------------------------------------------- |
| `README.md`                   | Setup, run instructions, demo accounts, sharing walkthrough, deployment |
| `ARCHITECTURE.md`             | What I prioritized and why, data model, authorization, what I cut       |
| `AI_WORKFLOW.md`              | AI tools used, where they helped, what I rejected, how I verified       |
| `SUBMISSION.md`               | This file                                                               |
| `WALKTHROUGH.txt`             | Walkthrough video URL                                                   |
| `CLAUDE.md`, `.cursor/rules/` | The five project conventions applied by both Claude Code and Cursor     |

## Source code

| Path                   | Contents                                                                     |
| ---------------------- | ---------------------------------------------------------------------------- |
| `src/app/`             | Routes (thin) and API route handlers                                         |
| `src/app/api/`         | Auth, documents CRUD, sharing, import, attachments                           |
| `src/sections/`        | Page compositions — `LoginPage`, `DocumentsPage`, `DocumentEditor`           |
| `src/components/`      | `ui/` primitives and `common/` shared components                             |
| `src/lib/`             | Supabase client, permissions, session, sanitization, validation, file import |
| `src/hooks/`           | `useAutosave`                                                                |
| `src/utils/`           | Small formatting helpers                                                     |
| `supabase/migrations/` | Three forward-only SQL migrations (schema, storage bucket, seed users)       |

## Tests

**`yarn test`** — 40 unit tests, 4 files, all passing.

| File                           | Covers                                                        |
| ------------------------------ | ------------------------------------------------------------- |
| `src/lib/permissions.test.ts`  | Owner/editor/viewer authorization rules                       |
| `src/lib/sessionToken.test.ts` | Session cookies can't be forged or tampered with              |
| `src/lib/sanitize.test.ts`     | XSS boundary — scripts, handlers, `javascript:` URLs stripped |
| `src/lib/importFile.test.ts`   | File-type detection and text/markdown conversion              |

**`yarn smoke`** — 46 end-to-end checks against the real HTTP API and live database, as three
different users: full document lifecycle, sharing and role promotion, import accept/reject,
attachment signed-URL download, and every authorization boundary. All passing.

---

## Required capabilities — where each one lives

| Requirement                       | Status | Where                                                                                        |
| --------------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| Create a document                 | ✅     | "New document" → `POST /api/documents`                                                       |
| Rename a document                 | ✅     | Inline title in the editor header, autosaved                                                 |
| Edit content in a browser         | ✅     | Tiptap editor at `/documents/[id]`                                                           |
| Save and reopen                   | ✅     | Debounced autosave; content persists in Postgres                                             |
| Bold / italic / underline         | ✅     | Editor toolbar                                                                               |
| Headings / text size              | ✅     | H1, H2, H3                                                                                   |
| Bulleted / numbered lists         | ✅     | Editor toolbar                                                                               |
| File upload                       | ✅     | **Two paths:** import `.txt`/`.md`/`.docx` → new document, and attach any file to a document |
| Supported file types stated in UI | ✅     | Documents toolbar subtitle + README                                                          |
| Document owner                    | ✅     | `documents.owner_id`                                                                         |
| Grant another user access         | ✅     | Share dialog → `POST /api/documents/[id]/shares`                                             |
| Owned vs shared distinction       | ✅     | "My documents" / "Shared with me" sections + "View only" badge                               |
| Persistence across refresh        | ✅     | Supabase Postgres                                                                            |
| Formatting preserved              | ✅     | Sanitized HTML round-trips through the editor schema                                         |
| Setup and run instructions        | ✅     | `README.md`                                                                                  |
| Working deployment                | ⬜     | _paste URL above once deployed_                                                              |
| Validation and error handling     | ✅     | Zod at every boundary; typed JSON errors; toasts; error boundary                             |
| At least one meaningful test      | ✅     | 40 tests — see above                                                                         |
| Architecture note                 | ✅     | `ARCHITECTURE.md`                                                                            |
| AI workflow note                  | ✅     | `AI_WORKFLOW.md`                                                                             |

## What's working, what's incomplete, what's next

### Working end to end

Everything in the table above, verified two ways: 40 unit tests, plus 46 end-to-end checks
(`yarn smoke`) that drive the real HTTP API as three different users against the live database.
Specifically confirmed working: create → format → autosave → reopen with formatting intact; rename;
`.md`/`.txt`/`.docx` import with headings, bold, lists, and links preserved; attachment upload and
signed-URL download; sharing with role changes; and every authorization boundary (a viewer can't
write, an editor can't re-share or delete, a non-recipient gets a 404 rather than a 403).

### Incomplete / not built

| Gap                                 | Impact                                                                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Real-time co-editing**            | Two people in the same document at once will last-write-wins each other. No presence UI.                                                                   |
| **Real authentication**             | Seeded accounts, no passwords. The cookie _is_ cryptographically signed, so it can't be forged — the fake part is only that there's no credential check.   |
| **Version history**                 | Saves overwrite; no undo across sessions.                                                                                                                  |
| **`.docx` fidelity**                | Verified with a real Word file: headings, bold/italic/underline, both list types, blockquotes and links survive. Images, tables and complex layout do not. |
| **Link/unlink control**             | Links survive import and paste but can't be created or removed by hand. Autolink is off for that reason — an unwanted link would be irreversible.          |
| **Comments / suggestions / export** | Not started — deliberate scope cuts.                                                                                                                       |
| **Component tests**                 | Tests target logic where silent failure is expensive, not rendering.                                                                                       |

### What I'd build next, with another 2–4 hours

In priority order — this is where I'd actually spend it:

1. **Real-time co-editing (~2h).** The biggest gap between this and the product it's imitating.
   Tiptap is ProseMirror-based specifically so this is additive: add Yjs + a websocket provider and
   a presence indicator, rather than rewriting the editor. This is why I chose Tiptap over a
   `contentEditable` surface even though the latter would have been faster today.
2. **Conflict safety as a stopgap (~30m).** If real-time didn't land, I'd at least add optimistic
   concurrency — send the last-known `updated_at` with each PATCH and reject stale writes with a 409
   plus a "someone else edited this" prompt. Silent data loss is the worst failure mode here.
3. **Document-level empty and loading states (~30m).** The list has an empty state; the editor
   doesn't have a skeleton, and slow saves have no optimistic feedback beyond the status text.
4. **Share-by-link with an expiring token (~1h).** The current model requires the recipient to
   already exist, which is the main thing that makes it feel like a demo rather than a product.

I would _not_ spend it on version history or export — they demo well but don't change whether the
core loop is trustworthy.

Full reasoning for every cut is in [`ARCHITECTURE.md`](ARCHITECTURE.md).
