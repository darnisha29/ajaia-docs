# Ajaia Docs

A lightweight collaborative document editor — create, edit, import, and share rich-text documents.

Built with Next.js (App Router), TypeScript, Tailwind CSS, Tiptap, and Supabase Postgres.

---

## What it does

| Capability      | Behaviour                                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Create/edit** | Rich text with bold, italic, underline, H1–H3, bulleted and numbered lists, quotes, links, code, undo/redo        |
| **Autosave**    | Debounced save ~900ms after you stop typing, with a live "Saving… / Saved" indicator                              |
| **Rename**      | Edit the title inline in the header; saves independently of content                                               |
| **Import**      | Upload `.txt`, `.md`, or `.docx` (≤5MB) and it becomes a new editable document with formatting preserved          |
| **Attachments** | Attach any file type (≤10MB) to a document; stored privately and served via short-lived signed URLs               |
| **Sharing**     | Owner grants another account **Can view** or **Can edit**; documents split into "My documents" / "Shared with me" |
| **Persistence** | Postgres — documents, shares, and attachments survive refresh, sign-out, and redeploy                             |

**Supported import formats: `.txt`, `.md`, `.docx` only.** Anything else is rejected with a clear
message. This is stated in the import UI as well. `.doc` (the pre-2007 binary format) is _not_
supported — only `.docx`.

---

## Setup

### Prerequisites

- Node.js 20+
- Yarn 1.x
- A Supabase project (free tier is fine)

### 1. Install

```bash
yarn install
```

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in from **Supabase → Project Settings → Data API / API Keys**:

| Variable                    | Where to find it                                                  |
| --------------------------- | ----------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`  | Project URL, e.g. `https://xxxx.supabase.co`                      |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key — **server-only, never expose to the browser** |
| `SESSION_SECRET`            | Any long random string: `openssl rand -hex 32`                    |

### 3. Database

Apply the migrations in `supabase/migrations/` **in filename order**. Either:

**Supabase Dashboard** → SQL Editor → paste and run each file in order:

1. `20260812120000_create_users_documents_shares.sql` — tables, indexes, `updated_at` trigger
2. `20260812120100_create_attachments_bucket.sql` — private storage bucket
3. `20260812120200_seed_users.sql` — the three demo accounts

**or the Supabase CLI:**

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### 4. Run

```bash
yarn dev
```

Open <http://localhost:3000>.

---

## Demo accounts

Sign-in is a user picker — no passwords. **These are the only accounts that exist**; signing in does
not create new users.

| Name         | Email              |
| ------------ | ------------------ |
| Ada Lovelace | `ada@ajaia.test`   |
| Grace Hopper | `grace@ajaia.test` |
| Alan Turing  | `alan@ajaia.test`  |

### Trying the sharing flow

1. Sign in as **Ada**, create a document, write something.
2. Click **Share**, enter `grace@ajaia.test`, choose **Can edit**, click Share.
3. Sign out (top right), sign in as **Grace**.
4. The document appears under **Shared with me** and is editable.
5. Repeat with **Can view** to see the read-only mode: disabled toolbar, "View only" badge.

---

## Scripts

| Command           | What it does                                             |
| ----------------- | -------------------------------------------------------- |
| `yarn dev`        | Dev server                                               |
| `yarn build`      | Production build                                         |
| `yarn start`      | Serve the production build                               |
| `yarn test`       | Run the Vitest suite                                     |
| `yarn smoke`      | End-to-end API test against a running server (see below) |
| `yarn tsc`        | Typecheck                                                |
| `yarn lint`       | ESLint                                                   |
| `yarn format:fix` | Prettier write                                           |

---

## Tests

### Unit — `yarn test`

36 tests covering the parts most likely to be wrong in a way that matters:

- **`permissions.test.ts`** — the owner/editor/viewer rules, including that an editor cannot re-share
  or delete, and that ownership always wins over a stale share row.
- **`sessionToken.test.ts`** — session cookies can't be forged by swapping in another user's id.
- **`sanitize.test.ts`** — scripts, event handlers, `javascript:` URLs, and iframes are stripped from
  document HTML.
- **`importFile.test.ts`** — extension detection, text/markdown conversion, and that a `.txt` file
  containing `<script>` imports as visible text rather than markup.

### End-to-end — `yarn smoke`

```bash
yarn dev      # terminal 1
yarn smoke    # terminal 2
```

**46 checks** driving the real HTTP API as three different users against the live database — the
wiring unit tests can't see. Verifies the full lifecycle (create → edit → share → promote → delete),
that formatting survives a round-trip while `<script>` does not, that `.md`/`.txt` import correctly
and `.png` is rejected, that attachments upload and download through signed URLs, and — most
importantly — that the authorization rules hold over HTTP:

- a non-recipient gets **404**, not 403 (IDs aren't enumerable)
- a viewer cannot write, re-share, or delete
- an editor can write but still cannot re-share or delete
- a user with no access cannot download attachments

Point it at a deployment with `BASE=https://your-app.vercel.app yarn smoke`. It creates and deletes
real documents, so don't aim it at data you care about.

---

## Deployment

Deploys to Vercel as-is.

1. Push to GitHub, import the repo in Vercel.
2. Add `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SESSION_SECRET` as environment
   variables (all environments).
3. Deploy. The same Supabase project backs local and deployed.

`SESSION_SECRET` is **required** in production — the app throws at startup rather than falling back
to the insecure dev default.

---

## Project conventions

Five strict conventions, documented in [`CLAUDE.md`](CLAUDE.md) and `.cursor/rules/`: arrow functions
only, responsibility-based folder structure, reuse-first code optimization, one component per file,
and forward-only SQL migrations. They're enforced by ESLint + Prettier and applied by both Claude
Code and Cursor.

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for what was prioritized and why, and
[`AI_WORKFLOW.md`](AI_WORKFLOW.md) for the AI-native workflow note.
# ajaia-docs
