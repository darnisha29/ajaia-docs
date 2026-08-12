# Architecture note

What I built, what I chose not to build, and why — for a 4–6 hour timebox.

---

## The prioritization call

The brief lists five areas. They are not equally risky, and they are not equally revealing.

**Rich-text editing** and **sharing** are where a document product either works or doesn't, so those
got the most time. **File upload** is a well-understood problem with one genuinely tricky part
(`.docx` → HTML), which I solved with a library rather than by hand. **Persistence** is a solved
problem I deliberately spent as little time on as possible. **Auth** I deliberately scoped _down_,
because building real auth would have consumed the hours that made sharing good, and the brief
explicitly permits seeded accounts.

The single most important consequence: **authorization is real even though authentication is fake.**
Every read and write resolves through one permission function, and that function is unit-tested. A
reviewer can verify the sharing model is correct without trusting the login screen.

---

## Stack

| Layer      | Choice                     | Why                                                                                                |
| ---------- | -------------------------- | -------------------------------------------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router)    | Server components for data loading, route handlers for the API, one deploy target                  |
| Editor     | Tiptap (ProseMirror)       | Schema-based, so the document model is structured rather than "whatever HTML the browser produced" |
| Database   | Supabase Postgres          | Real relational storage with foreign keys; deploys to Vercel without a filesystem                  |
| Files      | Supabase Storage (private) | Same platform, and private buckets give signed-URL access control for free                         |
| Validation | Zod                        | One schema per boundary, parsed server-side                                                        |
| Tests      | Vitest                     | Fast, no config fight, runs the pure logic where the real risk is                                  |

---

## Data model

```
users ──┬──< documents ──┬──< document_shares >── users
        │                └──< document_attachments >── users
        └──────────────────────────────────────────┘
```

- `documents.owner_id` — ownership lives on the document row, **not** in the shares table. A document
  therefore always has exactly one owner, and ownership cannot be accidentally revoked by deleting a
  share.
- `document_shares` — one row per (document, grantee) with role `viewer | editor`, unique on the pair
  so re-sharing updates the role instead of duplicating.
- `content_html` + `content_text` — HTML is the source of truth; the flattened text is derived on
  every write and used for list previews, so the documents list never ships full document HTML.

**Migrations are forward-only.** An applied migration is never edited; changes ship as a new numbered
file. This mirrors the convention in `CLAUDE.md` §5.

---

## Authorization

One pure function, [`resolveAccess`](src/lib/permissions.ts), is the single source of truth:

| Role   | View | Edit | Share | Delete |
| ------ | ---- | ---- | ----- | ------ |
| owner  | ✅   | ✅   | ✅    | ✅     |
| editor | ✅   | ✅   | ❌    | ❌     |
| viewer | ✅   | ❌   | ❌    | ❌     |
| none   | ❌   | ❌   | ❌    | ❌     |

Three decisions worth calling out:

1. **Editors cannot re-share.** Sharing stays owner-only, which keeps the access graph one level deep
   and means "who can see this" is answerable by reading one table.
2. **No-access returns 404, not 403.** A 403 confirms a document exists to someone who was never
   granted it, which makes document IDs enumerable. Both the API and the page render "not found".
3. **RLS is on with zero policies.** All server access uses the service-role key, which bypasses RLS,
   and authorization happens in app code. So the tables are locked by default: a leaked anon key
   reads nothing. This is a deliberate trade — it puts the rules in testable TypeScript rather than
   SQL policies, at the cost of _requiring_ that every query path go through `permissions.ts`.

---

## Things that took thought

**Sanitization is a server-side boundary, not a client-side nicety.** Document HTML arrives from
three places: the editor, imported files, and potentially a hand-rolled `PATCH`. All three land in
the same column and are later rendered as HTML. So sanitization happens in the data-access layer on
every write — the browser is never trusted to have done it.

**The sanitizer allowlist and the editor's extension list are the same contract, in both
directions.** Tiptap silently drops any node it has no extension for when it parses stored HTML.
StarterKit ships no `Link` extension — so without adding it, opening an imported `.md` file and
typing one character would have silently stripped every hyperlink on the next autosave. Caught this
while writing the extension config; the fix was adding `@tiptap/extension-link` and documenting the
two-way constraint in the file.

**Autosave has to survive the user leaving.** The hook coalesces in-flight requests (only one PATCH
open at a time, edits made during a request are written immediately after), flushes on unmount so
clicking "Back" mid-debounce doesn't lose the last edit, restores the pending value if a save fails
so it can be retried, and warns on `beforeunload` if a write is still outstanding.

**Entity decoding order is a real bug, not a nitpick.** In the HTML→text flattener, decoding `&amp;`
before `&lt;` turns the literal text `&amp;lt;` into `<` — reintroducing markup into "plain" text.
`&amp;` is decoded last. There's a test for it.

---

## Deliberately deprioritized

| Not built                         | Why, and what I'd do with more time                                                                                                                                                                                                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Real-time co-editing**          | The headline feature I most wanted and most clearly could not do well in the timebox. Correct multiplayer means CRDTs (Yjs + a websocket provider) and presence UI. Tiptap is ProseMirror-based specifically so this is an additive change, not a rewrite. Today, two people editing simultaneously will last-write-wins each other. |
| **Real authentication**           | Seeded accounts + a signed cookie. The brief permits this, and it makes the sharing demo one click instead of an account-creation flow. The signature is real, so cookies can't be forged — the fake part is only that there are no passwords.                                                                                       |
| **Version history**               | Every save overwrites. The schema would take it (an append-only `document_versions` table), but nothing in the brief needed it.                                                                                                                                                                                                      |
| **Sharing by link / invites**     | Sharing requires an existing account, matched by email. No email sending, no pending-invite state.                                                                                                                                                                                                                                   |
| **Comments, suggestions, export** | Straight scope cuts. None are load-bearing for "does this person understand the problem".                                                                                                                                                                                                                                            |
| **Component tests**               | Tests went where a silent failure is expensive — permissions, session forgery, sanitization, import parsing — rather than to rendering assertions that mostly restate JSX.                                                                                                                                                           |
| **Optimistic UI**                 | The list refetches after mutations instead of patching local state. Slightly slower, but it cannot drift from the database, which matters more in a sharing product.                                                                                                                                                                 |

---

## Known limitations

- **Concurrent edits last-write-win.** Two editors in the same document at the same time will
  overwrite each other; there is no locking, no merge, and no "someone else is editing" warning.
- **Import is one-way.** A `.docx` becomes HTML; there's no export back out.
- **`.docx` fidelity is mammoth's.** Semantic formatting (headings, lists, bold/italic, links) comes
  through; images, tables, and complex layout do not.
- **The user directory is fully visible** to any signed-in user, which is fine for three seeded demo
  accounts and would not be for real tenants.
