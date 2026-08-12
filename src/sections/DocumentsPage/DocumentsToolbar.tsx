"use client"

import { useRouter } from "next/navigation"
import { useRef } from "react"
import { FilePlus2, Upload } from "lucide-react"
import { toast } from "sonner"

import { ApiError, apiUpload } from "@/lib/apiClient"
import { Button } from "@/components/ui/button"
import { IMPORT_EXTENSIONS, MAX_IMPORT_BYTES } from "@/lib/importFile"

export type DocumentsToolbarProps = {
  busy: boolean
  onCreate: () => void
  onBusyChange: (busy: boolean) => void
}

const ACCEPT = IMPORT_EXTENSIONS.join(",")

const DocumentsToolbar = ({
  busy,
  onCreate,
  onBusyChange,
}: DocumentsToolbarProps) => {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const importFile = async (file: File) => {
    onBusyChange(true)

    try {
      const { id } = await apiUpload<{ id: string }>(
        "/api/documents/import",
        file,
      )

      toast.success("File imported.")
      router.push(`/documents/${id}`)
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Could not import that file.",
      )
      onBusyChange(false)
    }
  }

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Import supports {IMPORT_EXTENSIONS.join(", ")} up to{" "}
          {MAX_IMPORT_BYTES / 1024 / 1024}MB.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
        >
          <Upload className="size-4" />
          Import file
        </Button>

        <Button
          onClick={onCreate}
          disabled={busy}
        >
          <FilePlus2 className="size-4" />
          New document
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            // Reset first: picking the same file twice in a row fires no change
            // event otherwise, so a retry after an error would silently do nothing.
            event.target.value = ""
            if (file) importFile(file)
          }}
        />
      </div>
    </div>
  )
}

export default DocumentsToolbar
