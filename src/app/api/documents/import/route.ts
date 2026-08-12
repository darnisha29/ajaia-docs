import { NextResponse, type NextRequest } from "next/server"

import { createDocument } from "@/lib/documents"
import { getCurrentUser } from "@/lib/session"
import {
  convertFileToHtml,
  deriveTitleFromFileName,
  detectImportKind,
  IMPORT_EXTENSIONS,
  MAX_IMPORT_BYTES,
} from "@/lib/importFile"
import { badRequest, handleRouteError, unauthorized } from "@/lib/apiError"

// mammoth needs Node APIs (Buffer, zlib), so this route must not run on edge.
export const runtime = "nodejs"

/**
 * Upload a .txt / .md / .docx file and get back a new, editable document.
 * The file becomes document content — it is not stored as a blob. For keeping
 * the original file alongside a document, see the attachments route.
 */
export const POST = async (request: NextRequest) => {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()

    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return badRequest("Choose a file to import.")
    }

    if (file.size === 0) return badRequest("That file is empty.")

    if (file.size > MAX_IMPORT_BYTES) {
      return badRequest(
        `File is too large. Maximum import size is ${MAX_IMPORT_BYTES / 1024 / 1024}MB.`,
      )
    }

    if (!detectImportKind(file.name)) {
      return badRequest(
        `Unsupported file type. Supported formats: ${IMPORT_EXTENSIONS.join(", ")}`,
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { html } = await convertFileToHtml(file.name, buffer)

    if (!html.trim()) {
      return badRequest("That file has no readable text content.")
    }

    const document = await createDocument({
      ownerId: user.id,
      title: deriveTitleFromFileName(file.name),
      contentHtml: html,
    })

    return NextResponse.json(
      { id: document.id, title: document.title },
      { status: 201 },
    )
  } catch (error) {
    return handleRouteError(error)
  }
}
