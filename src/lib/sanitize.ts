import sanitizeHtml from "sanitize-html"

// The allowlist is intentionally the exact set of nodes and marks the editor can
// produce (see @/sections/DocumentEditor/editor/editorExtensions), plus the tags
// mammoth/marked emit on import. Anything else — script, style, iframe, event
// handlers, javascript: URLs — is dropped.
//
// This runs on the SERVER on every write path. Content arrives from the editor,
// from imported .docx/.md/.txt files, and could arrive from a hand-rolled POST,
// so the boundary is the database, not the browser.
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "hr",
  "a",
]

export const sanitizeDocumentHtml = (html: string): string =>
  sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
    },
    // No data:/javascript: — a link can only point somewhere a browser navigates.
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesAppliedToAttributes: ["href"],
    transformTags: {
      // Imported documents frequently carry links that would otherwise open in
      // place; force safe target/rel on everything.
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer",
      }),
    },
    // Drop the contents of disallowed tags entirely rather than inlining their
    // text — a <script> body should not become visible document text.
    nonTextTags: ["style", "script", "textarea", "option", "noscript"],
  })

// &amp; is decoded LAST: decoding it first would turn "&amp;lt;" into "&lt;" and
// then into "<", resurrecting markup that was correctly escaped.
const decodeEntities = (text: string): string =>
  text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")

/**
 * Flattens HTML to plain text for list previews and the content_text column.
 * Closing block tags become spaces first, so "<p>one</p><p>two</p>" reads as
 * "one two" rather than "onetwo".
 */
export const htmlToPlainText = (html: string): string => {
  const spaced = html.replace(
    /<\/(p|div|h[1-6]|li|ul|ol|blockquote|pre|tr)>/gi,
    " ",
  )

  const stripped = sanitizeHtml(spaced, {
    allowedTags: [],
    allowedAttributes: {},
    nonTextTags: ["style", "script", "textarea", "option", "noscript"],
  })

  return decodeEntities(stripped).replace(/\s+/g, " ").trim()
}
