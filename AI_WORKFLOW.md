# AI workflow note

> Review before submitting and adjust anything that doesn't match your own recollection — this is an
> account of how the code in this repo actually got written, and it should be yours.

## Tools used

| Tool                             | Used for                                                                                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claude Code (Claude Opus)**    | The primary driver — scaffolding, schema design, the server layer, UI components, tests                                                                    |
| **Project convention files**     | `CLAUDE.md` + `.cursor/rules/*.mdc`, carried over from an existing production codebase, so generated code matched house style without per-prompt reminders |
| **TypeScript / ESLint / Vitest** | The verification loop the AI output had to survive                                                                                                         |

## Where AI materially sped things up

- **Scaffolding and boilerplate.** Config parity with our existing project (Prettier, ESLint with
  `unused-imports`, tsconfig paths, the five convention rules), the CRUD route handlers, and the
  repetitive UI primitives. This is the work where AI is straightforwardly faster and the output is
  easy to verify by reading.
- **SQL migrations and the hand-maintained type file.** Four tables, indexes, an `updated_at`
  trigger, and a matching `database.types.ts` — mechanical, high-volume, error-prone by hand.
- **Test enumeration.** Given the permission table, generating the case matrix (including the ones I
  wouldn't have bothered writing, like "owner with a stale viewer share row") was close to free.
- **Getting unstuck on library specifics.** Which Tiptap extensions ship in StarterKit, what
  `mammoth`'s API looks like, the Next 16 async `params` signature.

## What I changed or rejected

Four things worth naming, because they're the cases where accepting the output would have shipped a
bug:

1. **Tiptap silently dropping links.** The first editor config disabled `codeBlock` and used only
   StarterKit + Underline. StarterKit has no `Link` extension — and Tiptap discards any node it lacks
   an extension for when parsing stored HTML. So opening an imported `.md` file and typing one
   character would have silently stripped every hyperlink on the next autosave. Fixed by adding
   `@tiptap/extension-link`, re-enabling `codeBlock`, and writing the two-way constraint between the
   extension list and the sanitizer allowlist into a comment in the file so it doesn't regress.

2. **An entity-decoding order bug.** The HTML→plain-text helper decoded `&amp;` first, which turns
   the literal text `&amp;lt;` into `<` — reintroducing markup into supposedly plain text. Reordered
   so `&amp;` is decoded last, and added a regression test.

3. **A recursive autosave callback that failed lint.** The first version called itself to drain
   queued edits, which React Compiler's `preserve-manual-memoization` rule rejects. Rewrote it as a
   drain loop — which also fixed a real behavioural gap: the original dropped the pending edit if a
   save failed. It now restores the value so a retry picks it up.

4. **A Supabase types shape that silently disabled all type checking.** The generated `Database` type
   omitted the `Relationships` key that `@supabase/supabase-js` requires. The failure mode is nasty:
   rather than erroring on the type itself, every query result quietly resolved to `never`, producing
   ~36 downstream errors that all looked like unrelated bugs. Found the actual constraint by reading
   `GenericTable` in `node_modules` rather than guessing.

I also **rejected the default scope instinct** more than once — the model will happily keep adding
features. Version history, comments, and export were cut deliberately; see `ARCHITECTURE.md`.

## How I verified correctness

AI-generated code was not trusted on read-through alone. Everything went through:

- **`yarn tsc`** — caught the Supabase types problem, which no amount of code review would have.
- **`yarn lint`** — caught the autosave memoization issue.
- **`yarn build`** — confirmed all 15 routes compile and nothing broke SSR.
- **`yarn test`** — 36 tests, written to target the places where a silent failure is expensive:
  permission rules, session-cookie forgery, HTML sanitization, and file-import parsing. Not
  coverage-chasing; each test names a specific way the app could be wrong.
- **Reading `node_modules` over trusting recall.** Twice — the Supabase `GenericTable` constraint and
  the Tiptap extension list — the model's assumption about a library was wrong, and the source of
  truth was on disk.

The honest summary: AI wrote most of the lines, and the judgment calls that made the result correct —
what to cut, which failures actually matter, and not accepting plausible-looking output for the four
issues above — were the part that took the real time.
