"use client"

import { useState } from "react"
import { File } from "lucide-react"
import { ICON_MAP } from "@/lib/icons"
import { fileIconFor } from "@/lib/file-icons"
import { ImageCard } from "@/components/dashboard/ImageCard"
import { FileRow } from "@/components/items/FileRow"
import { ItemCard } from "@/components/dashboard/ItemCard"
import { ItemDrawer } from "@/components/items/ItemDrawer"
import type { ItemWithMeta } from "@/lib/db/items"

interface ItemGridProps {
  items: ItemWithMeta[]
  /** `list` renders file rows (name, size, date, download) instead of cards. */
  layout?: "grid" | "list"
  className?: string
}

/**
 * Client wrapper around a grid of item cards: the pages that render items are
 * server components, so drawer state lives here.
 */
export function ItemGrid({
  items,
  layout = "grid",
  className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
}: ItemGridProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  function select(id: string) {
    setSelectedId(id)
    setOpen(true)
  }

  return (
    <>
      {layout === "list" ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {/* Mirrors FileRow's structure so the column headings line up. */}
          <div className="hidden items-center gap-3 border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground sm:flex">
            <span className="w-9 shrink-0" />
            <div className="flex flex-1 gap-4">
              <span className="flex-1">Name</span>
              <span className="w-20 shrink-0 text-right">Size</span>
              <span className="w-28 shrink-0">Uploaded</span>
            </div>
            <span className="w-9 shrink-0" />
          </div>
          <div className="divide-y divide-border">
            {items.map((item) => (
              <FileRow
                key={item.id}
                item={item}
                icon={fileIconFor(item.fileName)}
                onSelect={() => select(item.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className={className}>
          {items.map((item) => {
            const icon = ICON_MAP[item.type.icon] ?? File
            const onSelect = () => select(item.id)

            return item.type.slug === "images" && item.fileUrl ? (
              <ImageCard
                key={item.id}
                item={{ ...item, fileUrl: item.fileUrl }}
                icon={icon}
                onSelect={onSelect}
              />
            ) : (
              <ItemCard key={item.id} item={item} icon={icon} onSelect={onSelect} />
            )
          })}
        </div>
      )}

      {/* selectedId is kept on close so the drawer doesn't blank mid-animation */}
      <ItemDrawer itemId={selectedId} open={open} onOpenChange={setOpen} />
    </>
  )
}
