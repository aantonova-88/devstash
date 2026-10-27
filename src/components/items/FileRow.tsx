"use client"

import { Download, type LucideIcon } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn, formatDate, formatFileSize } from "@/lib/utils"

interface FileRowProps {
  item: {
    title: string
    fileUrl: string | null
    fileName: string | null
    fileSize: number | null
    createdAt: string
    type: { color: string }
  }
  /** Chosen by extension — see `fileIconFor`. */
  icon: LucideIcon
  onSelect: () => void
}

/** One row of the file list: icon, name, size, upload date and a download link. */
export function FileRow({ item, icon: Icon, onSelect }: FileRowProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onSelect()
    }
  }

  return (
    <div
      className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50"
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
        style={{ color: item.type.color, backgroundColor: `${item.type.color}20` }}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>

      {/* Stacked on mobile; size and date become their own columns from `sm`. */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.title}</p>
          {item.fileName && item.fileName !== item.title && (
            <p className="truncate text-xs text-muted-foreground">{item.fileName}</p>
          )}
        </div>
        <div className="flex gap-2 text-xs text-muted-foreground sm:contents">
          <span className="sm:w-20 sm:shrink-0 sm:text-right">
            {item.fileSize != null ? formatFileSize(item.fileSize) : "—"}
          </span>
          <span aria-hidden className="sm:hidden">·</span>
          <span className="sm:w-28 sm:shrink-0">{formatDate(item.createdAt)}</span>
        </div>
      </div>

      {item.fileUrl && (
        // Both handlers stop at the link: a click would otherwise open the
        // drawer too, and Enter would reach the row's handler, whose
        // preventDefault cancels the download.
        <a
          href={`${item.fileUrl}?download=1`}
          download={item.fileName ?? true}
          aria-label={`Download ${item.fileName ?? item.title}`}
          title="Download"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "shrink-0")}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Download />
        </a>
      )}
    </div>
  )
}
