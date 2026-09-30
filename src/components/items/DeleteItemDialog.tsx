"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { deleteItem } from "@/actions/items"

interface DeleteItemDialogProps {
  itemId: string
  title: string
  /** Called after a successful delete so the drawer can close. */
  onDeleted: () => void
}

/**
 * The drawer's trash button plus its confirmation dialog.
 *
 * The dialog is controlled rather than using a trigger, so the button keeps the
 * same markup the rest of the action bar uses. Deletion is permanent — there is
 * no undo — which is why the confirmation names the item.
 */
export function DeleteItemDialog({ itemId, title, onDeleted }: DeleteItemDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteItem(itemId)

      if (!result.success) {
        setOpen(false)
        toast.error(result.error)
        return
      }

      setOpen(false)
      toast.success(`"${result.data.title}" deleted`)
      onDeleted()
      // Drops the card from the server-rendered grid behind the drawer.
      router.refresh()
    })
  }

  return (
    <>
      <Button
        variant="destructive"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Delete item"
      >
        <Trash2 />
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2 className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              “{title}” will be permanently deleted, along with its tags and
              collection assignments. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={pending}
            >
              {pending && <Loader2 className="animate-spin" />}
              {pending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
