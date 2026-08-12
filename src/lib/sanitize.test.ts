import { describe, expect, it } from "vitest"

import { htmlToPlainText, sanitizeDocumentHtml } from "@/lib/sanitize"

// Imported .docx/.md files and raw PATCH bodies both land in content_html, which
// is later rendered as HTML. That makes this the app's XSS boundary.

describe("sanitizeDocumentHtml", () => {
  it("keeps the formatting the editor produces", () => {
    const html =
      "<h1>Title</h1><p><strong>bold</strong> <em>italic</em> <u>underline</u></p><ul><li>one</li></ul>"

    expect(sanitizeDocumentHtml(html)).toBe(html)
  })

  it("strips script tags and their contents", () => {
    const result = sanitizeDocumentHtml("<p>safe</p><script>alert(1)</script>")

    expect(result).toBe("<p>safe</p>")
    expect(result).not.toContain("alert")
  })

  it("strips inline event handlers", () => {
    const result = sanitizeDocumentHtml('<p onclick="steal()">text</p>')

    expect(result).toBe("<p>text</p>")
  })

  it("drops javascript: URLs but keeps https links", () => {
    expect(
      sanitizeDocumentHtml('<a href="javascript:alert(1)">x</a>'),
    ).not.toContain("javascript:")

    expect(
      sanitizeDocumentHtml('<a href="https://example.com">x</a>'),
    ).toContain('href="https://example.com"')
  })

  it("forces target and rel on links so imported documents can't hijack the opener", () => {
    const result = sanitizeDocumentHtml('<a href="https://example.com">x</a>')

    expect(result).toContain('target="_blank"')
    expect(result).toContain('rel="noopener noreferrer"')
  })

  it("removes iframes and style blocks", () => {
    const result = sanitizeDocumentHtml(
      '<iframe src="https://evil.test"></iframe><style>body{display:none}</style><p>ok</p>',
    )

    expect(result).toBe("<p>ok</p>")
  })
})

describe("htmlToPlainText", () => {
  it("separates block elements with a space instead of running them together", () => {
    expect(htmlToPlainText("<p>one</p><p>two</p>")).toBe("one two")
  })

  it("flattens list items", () => {
    expect(htmlToPlainText("<ul><li>alpha</li><li>beta</li></ul>")).toBe(
      "alpha beta",
    )
  })

  it("decodes entities without resurrecting escaped markup", () => {
    // "&amp;lt;" is a literal "&lt;" in the source text. Decoding &amp; before
    // &lt; would turn it into "<" and reintroduce a tag into "plain" text.
    expect(htmlToPlainText("<p>a &amp;lt;b&amp;gt; c</p>")).toBe(
      "a &lt;b&gt; c",
    )
  })

  it("returns an empty string for an empty document", () => {
    expect(htmlToPlainText("<p></p>")).toBe("")
  })
})
