"use client"

import { useState } from "react"
import { MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EditCollectionDialog } from "@/components/collections/EditCollectionDialog"
import { DeleteCollectionDialog } from "@/components/collections/DeleteCollectionDialog"

interface CollectionCardMenuProps {
  collection: {
    id: string
    name: string
    description: string | null
    isFavorite: boolean
  }
}

/**
 * The 3-dots menu on a collection card. It sits above the card's stretched
 * link, so using it never navigates.
 */
export function CollectionCardMenu({ collection }: CollectionCardMenuProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              className="relative z-10 text-muted-foreground"
              aria-label={`Actions for ${collection.name}`}
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {/* Inert until the favorite mutation exists. */}
          <DropdownMenuItem disabled>
            <Star />
            {collection.isFavorite ? "Remove from favorites" : "Add to favorites"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditCollectionDialog collection={collection} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteCollectionDialog collection={collection} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  )
}
