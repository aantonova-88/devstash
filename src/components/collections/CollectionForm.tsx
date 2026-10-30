"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field } from "@/components/items/Field"
import {
  COLLECTION_DESCRIPTION_MAX_LENGTH,
  COLLECTION_NAME_MAX_LENGTH,
} from "@/lib/validation/collection"
import type { ActionResult } from "@/actions/items"

export interface CollectionFormValues {
  name: string
  description: string
}

interface CollectionFormProps {
  /** Prefixes the field ids so the create and edit dialogs cannot collide. */
  idPrefix: string
  initialValues?: CollectionFormValues
  submitLabel: string
  pendingLabel: string
  onSubmit: (values: CollectionFormValues) => Promise<ActionResult<{ name: string }>>
  successMessage: (name: string) => string
  onCancel: () => void
  onSaved: () => void
}

/**
 * Name + description form shared by the create and edit dialogs. Controlled
 * inputs and no form library, matching the item forms; Zod in the action owns
 * validation.
 */
export function CollectionForm({
  idPrefix,
  initialValues = { name: "", description: "" },
  submitLabel,
  pendingLabel,
  onSubmit,
  successMessage,
  onCancel,
  onSaved,
}: CollectionFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState(initialValues.name)
  const [description, setDescription] = useState(initialValues.description)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await onSubmit({ name, description })

      if (!result.success) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(successMessage(result.data.name))
      onSaved()
      // Refreshes the sidebar collections, the grids and the stats.
      router.refresh()
    })
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-auto px-1 pb-1">
        <Field label="Name" htmlFor={`${idPrefix}-name`}>
          <Input
            id={`${idPrefix}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. React Patterns"
            maxLength={COLLECTION_NAME_MAX_LENGTH}
            disabled={pending}
            autoFocus
          />
        </Field>

        <Field label="Description" htmlFor={`${idPrefix}-description`}>
          <Textarea
            id={`${idPrefix}-description`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What belongs in this collection?"
            maxLength={COLLECTION_DESCRIPTION_MAX_LENGTH}
            rows={3}
            disabled={pending}
          />
        </Field>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <div className="-mx-4 -mb-4 mt-4 flex items-center gap-2 rounded-b-xl border-t border-border bg-muted/50 p-4">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={pending || name.trim() === ""}>
          {pending && <Loader2 className="animate-spin" />}
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  )
}
