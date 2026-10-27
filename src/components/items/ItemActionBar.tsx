"use client"

import { Copy, Download, Pencil, Pin, Star } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { DeleteItemDialog } from "@/components/items/DeleteItemDialog"
import { cn } from "@/lib/utils"
import type { ItemDetail } from "@/lib/db/items"

interface ItemActionBarProps {
  item: ItemDetail
  onCopy: () => void
  onEdit: () => void
  onDeleted: () => void
}

/** Footer actions of the drawer's view mode. */
export function ItemActionBar({ item, onCopy, onEdit, onDeleted }: ItemActionBarProps) {
  const hasCopyableContent = Boolean(item.content ?? item.url)

  // Favourite and pin need mutations that have not been written yet; until
  // then they show state but stay inert.
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

      {item.fileUrl ? (
        <a
          href={`${item.fileUrl}?download=1`}
          download={item.fileName ?? true}
          className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
        >
          <Download />
          Download
        </a>
      ) : (
        <Button
          variant="outline"
          className="flex-1"
          onClick={onCopy}
          disabled={!hasCopyableContent}
        >
          <Copy />
          Copy
        </Button>
      )}
      <Button className="flex-1" onClick={onEdit}>
        <Pencil />
        Edit
      </Button>

      <DeleteItemDialog itemId={item.id} title={item.title} onDeleted={onDeleted} />
    </div>
  )
}
