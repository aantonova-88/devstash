"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CreateItemForm } from "@/components/items/CreateItemForm"
import type { SidebarItemType } from "@/lib/db/items"

interface CreateItemDialogProps {
  itemTypes: SidebarItemType[]
}

/**
 * Owns the top bar's "New item" button and the dialog it opens.
 *
 * FILE types are filtered out: uploads are not implemented, so there is no way
 * to give a file or image item its content yet. The form is only mounted while
 * the dialog is open, so each open starts from a clean set of fields.
 */
export function CreateItemDialog({ itemTypes }: CreateItemDialogProps) {
  const [open, setOpen] = useState(false)

  const types = itemTypes.filter((t) => t.category !== "FILE")
  if (types.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="sm" className="gap-1.5 h-8 text-xs" />}
      >
        <Plus className="h-3.5 w-3.5" />
        New item
      </DialogTrigger>

      <DialogContent className="flex max-h-[85vh] flex-col gap-4 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New item</DialogTitle>
          <DialogDescription>
            Pick a type, then fill in the fields it uses.
          </DialogDescription>
        </DialogHeader>

        <CreateItemForm
          types={types}
          onCancel={() => setOpen(false)}
          onCreated={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
