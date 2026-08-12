import mammoth from "mammoth"
import { marked } from "marked"

import { sanitizeDocumentHtml } from "@/lib/sanitize"

// Supported import formats. Stated here, in the upload UI, and in the README —
// the three must stay in sync.
export const IMPORT_EXTENSIONS = [".txt", ".md", ".docx"] as const
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024

export type ImportKind = "text" | "markdown" | "docx"

const EXTENSION_KINDS: Record<string, ImportKind> = {
  txt: "text",
  md: "markdown",
  markdown: "markdown",
  docx: "docx",
}

/**
 * Resolves the import strategy from the filename extension.
 *
 * Extension, not MIME type: browsers report .md as everything from text/markdown
 * to application/octet-stream to "" depending on OS and browser, so the
 * extension is the more reliable signal. Returns null for unsupported files.
 */
export const detectImportKind = (fileName: string): ImportKind | null => {
  const extension = fileName.split(".").pop()?.toLowerCase()
  if (!extension) return null

  return EXTENSION_KINDS[extension] ?? null
}

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

/**
 * Plain text → HTML. Blank lines separate paragraphs; single newlines become
 * <br> so hand-wrapped text keeps its shape. Escaped first, so a .txt file
 * containing "<script>" imports as visible text, not markup.
 */
export const textToHtml = (text: string): string => {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  if (paragraphs.length === 0) return ""

  return paragraphs
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("")
}

export const markdownToHtml = async (markdown: string): Promise<string> => {
  const html = await marked.parse(markdown, { async: true })
  return sanitizeDocumentHtml(html)
}

// Mammoth's defaults drop two things this editor explicitly supports, so both
// are mapped back explicitly. Verified against a real Word-generated .docx —
// without these, underlined text imports as plain text and a Word "Quote"
// paragraph imports as an ordinary one.
//
// Mammoth ignores underline by default on the reasoning that Word documents
// often underline things that aren't emphasis (notably link text). That's a
// sensible default in general and the wrong one here: underline is a first-class
// button in our toolbar and an allowed tag in our sanitizer, so an imported
// document should round-trip it like any other mark.
const DOCX_STYLE_MAP = [
  "u => u",
  "p[style-name='Quote'] => blockquote:fresh",
  "p[style-name='Intense Quote'] => blockquote:fresh",
]

export const docxToHtml = async (buffer: Buffer): Promise<string> => {
  const { value } = await mammoth.convertToHtml(
    { buffer },
    { styleMap: DOCX_STYLE_MAP },
  )

  return sanitizeDocumentHtml(value)
}

/**
 * Strips the extension and tidies separators to make a reasonable default
 * document title: "q3-planning_notes.docx" → "q3 planning notes".
 */
export const deriveTitleFromFileName = (fileName: string): string => {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "")
  const cleaned = withoutExtension
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return cleaned || "Untitled document"
}

export type ConvertResult = { html: string; kind: ImportKind }

/**
 * Converts an uploaded file's bytes to sanitized document HTML.
 * Throws when the extension is unsupported — callers turn that into a 400.
 */
export const convertFileToHtml = async (
  fileName: string,
  buffer: Buffer,
): Promise<ConvertResult> => {
  const kind = detectImportKind(fileName)

  if (!kind) {
    throw new Error(
      `Unsupported file type. Supported formats: ${IMPORT_EXTENSIONS.join(", ")}`,
    )
  }

  if (kind === "docx") {
    return { html: await docxToHtml(buffer), kind }
  }

  const raw = buffer.toString("utf8")

  if (kind === "markdown") {
    return { html: await markdownToHtml(raw), kind }
  }

  return { html: sanitizeDocumentHtml(textToHtml(raw)), kind }
}
