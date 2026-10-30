"use client"

import { useState } from "react"
import { Pencil, Star, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditCollectionDialog } from "@/components/collections/EditCollectionDialog"
import { DeleteCollectionDialog } from "@/components/collections/DeleteCollectionDialog"
import { cn } from "@/lib/utils"
import type { CollectionSummary } from "@/lib/db/collections"

/** Favorite / Edit / Delete buttons in the collection page header. */
export function CollectionActions({ collection }: { collection: CollectionSummary }) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <div className="flex shrink-0 items-center gap-2">
      {/* Favoriting needs a mutation that has not been written yet; until then
          the button shows state but stays inert. */}
      <Button
        variant="outline"
        size="icon"
        disabled
        aria-pressed={collection.isFavorite}
        aria-label={collection.isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Star className={cn(collection.isFavorite && "fill-yellow-400 text-yellow-400")} />
      </Button>
      <Button variant="outline" onClick={() => setEditOpen(true)} aria-label="Edit collection">
        <Pencil />
        {/* Icon-only on phones, so the title keeps room to breathe. */}
        <span className="hidden sm:inline">Edit</span>
      </Button>
      <Button
        variant="destructive"
        size="icon"
        onClick={() => setDeleteOpen(true)}
        aria-label="Delete collection"
      >
        <Trash2 />
      </Button>

      <EditCollectionDialog collection={collection} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteCollectionDialog
        collection={collection}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        redirectTo="/collections"
      />
    </div>
  )
}
