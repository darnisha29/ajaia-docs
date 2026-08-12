import { z } from "zod"

// Every server boundary parses its payload through one of these. Nothing that
// reaches the database skips this file.

export const MAX_TITLE_LENGTH = 200
// ~1MB of HTML. Generous for a text document, but bounded so a single request
// can't fill the column (or the request body limit) unchecked.
export const MAX_CONTENT_LENGTH = 1_000_000

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
})

export const createDocumentSchema = z.object({
  title: z.string().trim().max(MAX_TITLE_LENGTH).optional(),
})

// .partial() with a refine: PATCH is used for both rename and autosave, and an
// empty body should be a 400 rather than a silent no-op write.
export const updateDocumentSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title cannot be empty.")
      .max(
        MAX_TITLE_LENGTH,
        `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`,
      )
      .optional(),
    contentHtml: z
      .string()
      .max(MAX_CONTENT_LENGTH, "Document is too large to save.")
      .optional(),
  })
  .refine(
    (value) => value.title !== undefined || value.contentHtml !== undefined,
    { message: "Provide a title or content to update." },
  )

export const shareRoleSchema = z.enum(["viewer", "editor"])

export const createShareSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  role: shareRoleSchema.default("editor"),
})

export const updateShareSchema = z.object({
  role: shareRoleSchema,
})

export type LoginInput = z.infer<typeof loginSchema>
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>
export type CreateShareInput = z.infer<typeof createShareSchema>
