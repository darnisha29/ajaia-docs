# Submission contents

**Project:** Ajaia Docs — a lightweight collaborative document editor
**Live URL:** _<!-- paste the deployed Vercel URL here -->_
**Walkthrough video:** see `WALKTHROUGH.txt`

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

**`yarn test`** — 36 unit tests, 4 files, all passing.

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
| At least one meaningful test      | ✅     | 36 tests — see above                                                                         |
| Architecture note                 | ✅     | `ARCHITECTURE.md`                                                                            |
| AI workflow note                  | ✅     | `AI_WORKFLOW.md`                                                                             |

## Known limitations

Stated in full in `ARCHITECTURE.md`. The headline ones:

- **No real-time co-editing.** Concurrent edits are last-write-wins.
- **Auth is seeded accounts + a signed cookie**, not real authentication. Authorization, however, is
  real and tested.
- **No version history** — saves overwrite.
- **`.docx` import** preserves semantic formatting, not images or tables.
