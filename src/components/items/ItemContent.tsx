"use client"

import { Copy, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CodeEditor } from "@/components/items/CodeEditor"
import { FilePreview } from "@/components/items/FilePreview"
import { MarkdownEditor } from "@/components/items/MarkdownEditor"
import { SectionLabel } from "@/components/items/SectionLabel"
import { fallbackLanguageForSlug } from "@/lib/monaco"
import { contentEditorFor } from "@/lib/validation/item"
import type { ItemDetail } from "@/lib/db/items"

/**
 * Renders whichever content field the item's category populates. Code types get
 * the syntax-highlighted `CodeEditor`, notes and prompts the rendered
 * `MarkdownEditor`; any other text type keeps the plain line-numbered block.
 */
export function ItemContent({ item, onCopy }: { item: ItemDetail; onCopy: () => void }) {
  if (item.content) {
    const editor = contentEditorFor(item.type.slug)

    return (
      <section className="space-y-2">
        <SectionLabel>Content</SectionLabel>
        {editor === "code" ? (
          <CodeEditor
            value={item.content}
            language={item.language}
            fallbackLanguage={fallbackLanguageForSlug(item.type.slug)}
            ariaLabel={`${item.title} content`}
          />
        ) : editor === "markdown" ? (
          <MarkdownEditor value={item.content} ariaLabel={`${item.title} content`} />
        ) : (
          <PlainContent item={item} content={item.content} onCopy={onCopy} />
        )}
      </section>
    )
  }

  if (item.url) {
    return (
      <section className="space-y-2">
        <SectionLabel>Link</SectionLabel>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm break-all text-primary hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          {item.url}
        </a>
      </section>
    )
  }

  if (item.fileUrl) {
    const isImage = item.type.slug === "images"

    return (
      <section className="space-y-2">
        <SectionLabel>{isImage ? "Image" : "File"}</SectionLabel>
        <FilePreview
          fileName={item.fileName}
          fileSize={item.fileSize}
          imageSrc={isImage ? item.fileUrl : null}
          imageAlt={item.fileName ?? item.title}
        />
      </section>
    )
  }

  return (
    <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      This item has no content yet.
    </p>
  )
}

/** Read-only text with a line-number gutter, for TEXT types with no richer editor. */
function PlainContent({
  item,
  content,
  onCopy,
}: {
  item: ItemDetail
  content: string
  onCopy: () => void
}) {
  const lines = content.split("\n")

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/40">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: item.type.color }}
          />
          {item.language ?? item.type.name.toLowerCase()}
        </span>
        <span className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-muted-foreground">
            {lines.length} {lines.length === 1 ? "line" : "lines"}
          </span>
          <Button variant="ghost" size="xs" onClick={onCopy}>
            <Copy />
            Copy
          </Button>
        </span>
      </div>
      <div className="max-h-96 overflow-auto">
        <pre className="flex min-w-max font-mono text-xs leading-relaxed">
          <span
            aria-hidden
            className="shrink-0 border-r border-border px-3 py-3 text-right text-muted-foreground/60 select-none"
          >
            {lines.map((_, i) => (
              <span key={i} className="block">
                {i + 1}
              </span>
            ))}
          </span>
          <code className="px-3 py-3">{content}</code>
        </pre>
      </div>
    </div>
  )
}
