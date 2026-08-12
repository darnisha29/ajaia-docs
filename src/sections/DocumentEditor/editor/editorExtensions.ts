import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import Underline from "@tiptap/extension-underline"

// The node/mark set here is the contract with @/lib/sanitize: the server strips
// anything these extensions can't produce, and — just as importantly — Tiptap
// drops anything it has no node for when it parses stored HTML. So the two lists
// must match in BOTH directions, or a document round-trip loses content.
//
// Link and Underline are why this matters concretely: neither ships in
// StarterKit, and imported .md/.docx files are full of links. Without the Link
// extension, opening an imported document and typing one character would
// silently strip every hyperlink on the next autosave.
export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  Underline,
  Link.configure({
    openOnClick: false,
    // autolink OFF, deliberately. It links any token ending in something that
    // looks like a TLD, so ordinary prose — "check.Live", "app.Dev", a filename
    // like "notes.page" — silently becomes a hyperlink while you type. That
    // would be a tolerable annoyance if it were reversible, but this build ships
    // no link/unlink button, so there is no way for a user to undo it. Links
    // still arrive via import and paste, which is where they actually come from.
    autolink: false,
    linkOnPaste: true,
    HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
  }),
  Placeholder.configure({
    placeholder: "Start writing, or import a file…",
  }),
]
