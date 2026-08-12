import { describe, expect, it } from "vitest"

import {
  convertFileToHtml,
  deriveTitleFromFileName,
  detectImportKind,
  markdownToHtml,
  textToHtml,
} from "@/lib/importFile"

describe("detectImportKind", () => {
  it("maps supported extensions, case-insensitively", () => {
    expect(detectImportKind("notes.txt")).toBe("text")
    expect(detectImportKind("README.MD")).toBe("markdown")
    expect(detectImportKind("brief.docx")).toBe("docx")
  })

  it("rejects unsupported and extensionless files", () => {
    expect(detectImportKind("photo.png")).toBeNull()
    expect(detectImportKind("archive.doc")).toBeNull()
    expect(detectImportKind("Makefile")).toBeNull()
  })

  it("uses the final extension, not an earlier one in the name", () => {
    expect(detectImportKind("report.docx.png")).toBeNull()
    expect(detectImportKind("v1.2.notes.md")).toBe("markdown")
  })
})

describe("textToHtml", () => {
  it("splits blank-line-separated blocks into paragraphs", () => {
    expect(textToHtml("first\n\nsecond")).toBe("<p>first</p><p>second</p>")
  })

  it("keeps single newlines as line breaks", () => {
    expect(textToHtml("line one\nline two")).toBe("<p>line one<br>line two</p>")
  })

  it("escapes markup so a .txt file imports as text, not HTML", () => {
    const result = textToHtml("<script>alert(1)</script>")

    expect(result).toBe("<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>")
  })

  it("returns an empty string for whitespace-only input", () => {
    expect(textToHtml("   \n\n  ")).toBe("")
  })
})

describe("markdownToHtml", () => {
  it("converts headings, emphasis, and lists", async () => {
    const result = await markdownToHtml("# Title\n\n**bold**\n\n- one\n- two")

    expect(result).toContain("<h1>Title</h1>")
    expect(result).toContain("<strong>bold</strong>")
    expect(result).toContain("<li>one</li>")
  })

  it("sanitizes HTML embedded in the markdown source", async () => {
    const result = await markdownToHtml("ok\n\n<script>alert(1)</script>")

    expect(result).not.toContain("<script")
    expect(result).not.toContain("alert(1)")
  })
})

describe("deriveTitleFromFileName", () => {
  it("strips the extension and tidies separators", () => {
    expect(deriveTitleFromFileName("q3-planning_notes.docx")).toBe(
      "q3 planning notes",
    )
  })

  it("keeps dots that are part of the name", () => {
    expect(deriveTitleFromFileName("v1.2-spec.md")).toBe("v1.2 spec")
  })

  it("falls back to a default when nothing is left", () => {
    expect(deriveTitleFromFileName(".md")).toBe("Untitled document")
  })
})

describe("convertFileToHtml", () => {
  it("converts a markdown buffer end to end", async () => {
    const { html, kind } = await convertFileToHtml(
      "notes.md",
      Buffer.from("# Hello\n\nworld", "utf8"),
    )

    expect(kind).toBe("markdown")
    expect(html).toContain("<h1>Hello</h1>")
  })

  it("throws on an unsupported extension rather than importing garbage", async () => {
    await expect(
      convertFileToHtml("image.png", Buffer.from("binary", "utf8")),
    ).rejects.toThrow(/Unsupported file type/)
  })
})
