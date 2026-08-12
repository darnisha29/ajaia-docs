"use client"

import { MAX_TITLE_LENGTH } from "@/lib/validation"

export type DocumentTitleProps = {
  title: string
  readOnly: boolean
  onChange: (title: string) => void
}

const DocumentTitle = ({ title, readOnly, onChange }: DocumentTitleProps) => (
  <input
    value={title}
    readOnly={readOnly}
    maxLength={MAX_TITLE_LENGTH}
    aria-label="Document title"
    onChange={(event) => onChange(event.target.value)}
    placeholder="Untitled document"
    className="w-full truncate rounded-md bg-transparent px-1.5 py-1 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none read-only:cursor-default hover:not-read-only:bg-muted"
  />
)

export default DocumentTitle
