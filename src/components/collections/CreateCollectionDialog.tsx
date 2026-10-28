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
import { CreateCollectionForm } from "@/components/collections/CreateCollectionForm"

/**
 * Owns the top bar's "New collection" button and the dialog it opens. The form
 * is only mounted while the dialog is open, so each open starts clean.
 */
export function CreateCollectionDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-8 text-xs"
            aria-label="New collection"
          />
        }
      >
        <Plus className="h-3.5 w-3.5" />
        {/* Icon-only on phones, where the top bar has no room for two labels. */}
        <span className="hidden sm:inline">New collection</span>
      </DialogTrigger>

      <DialogContent className="flex max-h-[85vh] flex-col gap-4 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New collection</DialogTitle>
          <DialogDescription>
            Group related items together. You can add items to it later.
          </DialogDescription>
        </DialogHeader>

        <CreateCollectionForm
          onCancel={() => setOpen(false)}
          onCreated={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
