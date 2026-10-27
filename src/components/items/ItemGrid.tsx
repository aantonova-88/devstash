"use client"

import { useState } from "react"
import { File } from "lucide-react"
import { ICON_MAP } from "@/lib/icons"
import { ImageCard } from "@/components/dashboard/ImageCard"
import { ItemCard } from "@/components/dashboard/ItemCard"
import { ItemDrawer } from "@/components/items/ItemDrawer"
import type { ItemWithMeta } from "@/lib/db/items"

interface ItemGridProps {
  items: ItemWithMeta[]
  className?: string
}

/**
 * Client wrapper around a grid of item cards: the pages that render items are
 * server components, so drawer state lives here.
 */
export function ItemGrid({
  items,
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

      {/* selectedId is kept on close so the drawer doesn't blank mid-animation */}
      <ItemDrawer itemId={selectedId} open={open} onOpenChange={setOpen} />
    </>
  )
}
