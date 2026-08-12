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

### Three more found by testing what I hadn't tested

At the point where the code was "done" — tests green, build clean — two gaps were left where I had
_reasoned_ that things worked rather than _observed_ it: `.docx` import had never seen a real Word
file, and the UI had never been rendered in a browser. Closing those two gaps found three bugs that
no amount of re-reading would have surfaced:

5. **`.docx` import silently dropped underline.** Generated a real Word file with `python-docx`
   (headings, bold/italic/underline, both list types) and pushed it through the live import route.
   Everything converted except underline — mammoth ignores it by default, on the reasonable general
   theory that Word documents underline things that aren't emphasis. Wrong default _here_, where
   underline is a toolbar button and an allowed tag. Fixed with an explicit style map, which also
   picked up Word's Quote styles as blockquotes. The real file is now a committed test fixture, so
   it can't regress.

6. **The editor toolbar wrapped to two rows on mobile,** orphaning the redo button and making the
   sticky bar double-height. Found by screenshotting at 390px with headless Chrome. Now scrolls
   horizontally instead — one row at any width.

7. **Autolink turned ordinary prose into hyperlinks.** Spotted in a screenshot: typed text
   "check.Live" had silently become a link, because `.live` is a real TLD. Tolerable if reversible —
   but this build has no unlink button, so it wasn't. Disabled autolink; links still arrive via
   import and paste, which is where they actually come from.

The pattern in all three: they were invisible to the type checker, the linter, and the unit tests,
and visible within seconds of looking at real output.

## How I verified correctness

AI-generated code was not trusted on read-through alone. Everything went through:

- **`yarn tsc`** — caught the Supabase types problem, which no amount of code review would have.
- **`yarn lint`** — caught the autosave memoization issue.
- **`yarn build`** — confirmed all 15 routes compile and nothing broke SSR.
- **`yarn test`** — 40 tests, written to target the places where a silent failure is expensive:
  permission rules, session-cookie forgery, HTML sanitization, and file-import parsing. Not
  coverage-chasing; each test names a specific way the app could be wrong.
- **`yarn smoke`** — 46 end-to-end checks I wrote to drive the real HTTP API as three different users
  against the live database. This is what actually proves the sharing model: that a viewer gets a
  403 on write, that a non-recipient gets a 404 rather than a 403, that an editor still can't
  re-share. Unit tests assert the rules; this asserts the rules are _wired up_.
- **A real `.docx`, not an assumed one.** Generated with `python-docx` and pushed through the live
  route. Found the underline bug.
- **Headless Chrome screenshots at 1440px and 390px.** Found the toolbar wrap and the autolink trap,
  and confirmed zero console errors and no horizontal overflow on mobile.
- **Reading `node_modules` over trusting recall.** Twice — the Supabase `GenericTable` constraint and
  the Tiptap extension list — the model's assumption about a library was wrong, and the source of
  truth was on disk.

The honest summary: AI wrote most of the lines, and the judgment calls that made the result correct —
what to cut, which failures actually matter, and not accepting plausible-looking output for the seven
issues above — were the part that took the real time.

The sharpest lesson was #5–7. Everything was green: types, lint, build, 36 tests at the time. It would have been
easy to call it done. Three real bugs were sitting in the two places I had reasoned about instead of
looked at. "It compiles and the tests pass" is a claim about the code; it is not a claim about the
product.
