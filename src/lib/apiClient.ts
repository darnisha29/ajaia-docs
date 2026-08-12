import type { ApiErrorBody } from "@/lib/apiError"

/**
 * Thrown for any non-2xx response, carrying the server's human-readable message
 * so callers can pass it straight to a toast instead of inventing their own.
 */
export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

const parseError = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as ApiErrorBody
    return body.error || "Request failed."
  } catch {
    return "Request failed."
  }
}

/** JSON fetch wrapper. Use `apiUpload` for multipart — it must not set Content-Type. */
export const apiFetch = async <T>(
  url: string,
  init?: RequestInit,
): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers:
      init?.body === undefined
        ? init?.headers
        : { "Content-Type": "application/json", ...init?.headers },
  })

  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status)
  }

  return (await response.json()) as T
}

/**
 * Multipart upload. The browser must set Content-Type itself so the multipart
 * boundary is included — setting it by hand produces an unparseable body.
 */
export const apiUpload = async <T>(url: string, file: File): Promise<T> => {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(url, { method: "POST", body: formData })

  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status)
  }

  return (await response.json()) as T
}
