"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CollectionForm } from "@/components/collections/CollectionForm"
import { updateCollection } from "@/actions/collections"

interface EditCollectionDialogProps {
  collection: { id: string; name: string; description: string | null }
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Controlled dialog for editing a collection's name and description. It has no
 * trigger of its own because it opens from both the collection page's Edit
 * button and the card's dropdown menu. The form only mounts while open, so each
 * open starts from the collection's current values.
 */
export function EditCollectionDialog({ collection, open, onOpenChange }: EditCollectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-4 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit collection</DialogTitle>
          <DialogDescription>Update the name and description.</DialogDescription>
        </DialogHeader>

        <CollectionForm
          idPrefix="edit-collection"
          initialValues={{
            name: collection.name,
            description: collection.description ?? "",
          }}
          submitLabel="Save"
          pendingLabel="Saving…"
          onSubmit={(values) => updateCollection(collection.id, values)}
          successMessage={() => "Collection saved"}
          onCancel={() => onOpenChange(false)}
          onSaved={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
