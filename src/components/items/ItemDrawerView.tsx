"use client"

import { Sparkles } from "lucide-react"
import { ItemActionBar } from "@/components/items/ItemActionBar"
import { ItemContent } from "@/components/items/ItemContent"
import { SectionLabel } from "@/components/items/SectionLabel"
import { copyToClipboard } from "@/lib/clipboard"
import { formatDate, relativeTime } from "@/lib/utils"
import type { ItemDetail } from "@/lib/db/items"

interface ItemDrawerViewProps {
  item: ItemDetail
  onEdit: () => void
  onDeleted: () => void
}

/** Read-only body of the item drawer: content, metadata, tags and actions. */
export function ItemDrawerView({ item, onEdit, onDeleted }: ItemDrawerViewProps) {
  async function copyContent() {
    // A file's URL is a same-origin proxy path, which is no use on a clipboard;
    // files get a Download button instead.
    const value = item.content ?? item.url
    if (!value) return
    await copyToClipboard(value)
  }

  return (
    <>
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

        <ItemTags tags={item.tags} aiTags={item.aiTags} />
      </div>

      <ItemActionBar
        item={item}
        onCopy={copyContent}
        onEdit={onEdit}
        onDeleted={onDeleted}
      />
    </>
  )
}

/** User tags, then AI-suggested tags marked with a sparkle. Hidden when both are empty. */
function ItemTags({ tags, aiTags }: Pick<ItemDetail, "tags" | "aiTags">) {
  if (tags.length === 0 && aiTags.length === 0) return null

  return (
    <section className="space-y-2">
      <SectionLabel>Tags</SectionLabel>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag.name}
            className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground"
          >
            {tag.name}
          </span>
        ))}
        {aiTags.map((tag) => (
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
  )
}

function MetaTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <SectionLabel>{label}</SectionLabel>
      <p className="mt-1 truncate text-sm" title={value}>
        {value}
      </p>
    </div>
  )
}
