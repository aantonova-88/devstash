"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  Copy,
  ExternalLink,
  File,
  Pencil,
  Pin,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ICON_MAP } from "@/lib/icons"
import { cn, formatDate, formatFileSize, relativeTime } from "@/lib/utils"
import type { ItemDetail } from "@/lib/db/items"

interface ItemDrawerProps {
  itemId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface LoadedDetail {
  id: string
  item?: ItemDetail
  error?: string
}

export function ItemDrawer({ itemId, open, onOpenChange }: ItemDrawerProps) {
  const [detail, setDetail] = useState<LoadedDetail | null>(null)

  useEffect(() => {
    if (!open || !itemId) return

    const controller = new AbortController()

    async function load(id: string) {
      try {
        const res = await fetch(`/api/items/${id}`, { signal: controller.signal })
        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          setDetail({ id, error: data.error ?? "Could not load this item" })
          return
        }

        setDetail({ id, item: data.item })
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        setDetail({ id, error: "Could not load this item" })
      }
    }

    load(itemId)
    return () => controller.abort()
  }, [open, itemId])

  // Keying the loaded detail by id means a drawer opened on another item shows
  // the skeleton rather than briefly flashing the previous item's content.
  const current = detail?.id === itemId ? detail : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 p-0 data-[side=right]:w-full sm:max-w-2xl!">
        {current?.error ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <p className="text-sm text-muted-foreground">{current.error}</p>
          </div>
        ) : current?.item ? (
          <ItemDrawerBody item={current.item} />
        ) : (
          <ItemDrawerSkeleton />
        )}
      </SheetContent>
    </Sheet>
  )
}

function ItemDrawerBody({ item }: { item: ItemDetail }) {
  const Icon = ICON_MAP[item.type.icon] ?? File

  async function copyContent() {
    const value = item.content ?? item.url ?? item.fileUrl
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      toast.success("Copied to clipboard")
    } catch {
      toast.error("Could not copy to clipboard")
    }
  }

  return (
    <>
      <SheetHeader className="gap-3 border-b border-border p-6 pr-14">
        <span
          className="flex items-center gap-1.5 self-start rounded px-2 py-1 text-[10px] font-semibold tracking-wider uppercase"
          style={{ color: item.type.color, backgroundColor: `${item.type.color}20` }}
        >
          <Icon className="h-3 w-3" />
          {item.type.name}
        </span>
        <SheetTitle className="font-serif text-2xl leading-tight">
          {item.title}
        </SheetTitle>
        {item.description && (
          <SheetDescription>{item.description}</SheetDescription>
        )}
      </SheetHeader>

      <div className="flex-1 space-y-6 overflow-auto p-6">
        <ItemContent item={item} onCopy={copyContent} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MetaTile label="Last used" value={item.lastUsedAt ? relativeTime(item.lastUsedAt) : "Never"} />
          <MetaTile label="Language" value={item.language ?? "—"} />
          <MetaTile label="Created" value={formatDate(item.createdAt)} />
          <MetaTile
            label="Collections"
            value={
              item.collections.length === 0
                ? "None"
                : item.collections.map((c) => c.name).join(", ")
            }
          />
        </div>

        {(item.tags.length > 0 || item.aiTags.length > 0) && (
          <section className="space-y-2">
            <SectionLabel>Tags</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span
                  key={tag.name}
                  className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground"
                >
                  {tag.name}
                </span>
              ))}
              {item.aiTags.map((tag) => (
                <span
                  key={`ai-${tag}`}
                  className="flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-2 py-1 text-xs text-primary"
                  title="AI-suggested tag"
                >
                  <Sparkles className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>

      <ItemActionBar item={item} onCopy={copyContent} />
    </>
  )
}

/**
 * Renders whichever content field the item's category populates. Rich editing
 * and syntax highlighting land with the editor slice.
 */
function ItemContent({ item, onCopy }: { item: ItemDetail; onCopy: () => void }) {
  if (item.content) {
    const lines = item.content.split("\n")

    return (
      <section className="space-y-2">
        <SectionLabel>Content</SectionLabel>
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
              <code className="px-3 py-3">{item.content}</code>
            </pre>
          </div>
        </div>
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
    return (
      <section className="space-y-2">
        <SectionLabel>File</SectionLabel>
        <a
          href={item.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm hover:bg-muted"
        >
          <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{item.fileName ?? "Download"}</span>
          {item.fileSize != null && (
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {formatFileSize(item.fileSize)}
            </span>
          )}
        </a>
      </section>
    )
  }

  return (
    <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      This item has no content yet.
    </p>
  )
}

function ItemActionBar({ item, onCopy }: { item: ItemDetail; onCopy: () => void }) {
  const hasCopyableContent = Boolean(item.content ?? item.url ?? item.fileUrl)

  // Favourite, pin, edit and delete need the item mutations that arrive with
  // the CRUD slice; until then they show state but stay inert.
  return (
    <div className="flex items-center gap-2 border-t border-border p-4">
      <Button
        variant="outline"
        size="icon"
        disabled
        aria-pressed={item.isFavorite}
        aria-label={item.isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Star
          className={cn(item.isFavorite && "fill-primary text-primary")}
        />
      </Button>
      <Button
        variant="outline"
        size="icon"
        disabled
        aria-pressed={item.isPinned}
        aria-label={item.isPinned ? "Unpin item" : "Pin item"}
      >
        <Pin className={cn(item.isPinned && "fill-primary text-primary")} />
      </Button>

      <Button
        variant="outline"
        className="flex-1"
        onClick={onCopy}
        disabled={!hasCopyableContent}
      >
        <Copy />
        Copy
      </Button>
      <Button className="flex-1" disabled>
        <Pencil />
        Edit
      </Button>

      <Button variant="destructive" size="icon" disabled aria-label="Delete item">
        <Trash2 />
      </Button>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
      {children}
    </p>
  )
}

function MetaTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 truncate text-sm" title={value}>
        {value}
      </p>
    </div>
  )
}

function ItemDrawerSkeleton() {
  return (
    <div className="flex-1 animate-pulse p-6" aria-busy="true" aria-label="Loading item">
      <div className="h-5 w-20 rounded bg-muted" />
      <div className="mt-4 h-7 w-2/3 rounded bg-muted" />
      <div className="mt-3 h-4 w-1/2 rounded bg-muted" />
      <div className="mt-8 h-32 rounded-lg bg-muted" />
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  )
}
