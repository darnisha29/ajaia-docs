import DocumentCard from "@/sections/DocumentsPage/documents/DocumentCard"
import type { DocumentSummary } from "@/lib/types"

export type DocumentGroupProps = {
  title: string
  emptyMessage: string
  documents: DocumentSummary[]
  onDelete?: (id: string) => void
}

const DocumentGroup = ({
  title,
  emptyMessage,
  documents,
  onDelete,
}: DocumentGroupProps) => (
  <section>
    <div className="mb-3 flex items-baseline gap-2">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      <span className="text-xs text-muted-foreground">{documents.length}</span>
    </div>

    {documents.length === 0 ? (
      <p className="rounded-[var(--radius)] border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    ) : (
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {documents.map((document) => (
          <DocumentCard
            key={document.id}
            document={document}
            onDelete={onDelete}
          />
        ))}
      </ul>
    )}
  </section>
)

export default DocumentGroup
