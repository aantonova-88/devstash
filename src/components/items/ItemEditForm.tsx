"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { updateItem } from "@/actions/items"
import { ItemFields, type ItemFieldValues } from "@/components/items/ItemFields"
import { formLayoutForType, parseTagInput } from "@/lib/validation/item"
import type { ItemDetail } from "@/lib/db/items"

interface ItemEditFormProps {
  item: ItemDetail
  onCancel: () => void
  onSaved: (item: ItemDetail) => void
}

/**
 * Inline edit form for the item drawer. Controlled inputs with local state —
 * no form library, per the spec. Type, collections and dates are not editable
 * here; the drawer keeps showing them read-only.
 */
export function ItemEditForm({ item, onCancel, onSaved }: ItemEditFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [values, setValues] = useState<ItemFieldValues>(() => ({
    title: item.title,
    description: item.description ?? "",
    content: item.content ?? "",
    language: item.language ?? "",
    url: item.url ?? "",
    tags: item.tags.map((t) => t.name).join(", "),
  }))

  const layout = formLayoutForType(item.type)
  const titleEmpty = values.title.trim() === ""

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await updateItem(item.id, {
        title: values.title,
        description: values.description,
        content: layout.content ? values.content : null,
        language: layout.language ? values.language : null,
        url: layout.url ? values.url : null,
        tags: parseTagInput(values.tags),
      })

      if (!result.success) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success("Item saved")
      onSaved(result.data)
      // Refreshes the server-rendered card grid behind the drawer.
      router.refresh()
    })
  }

  return (
    // noValidate keeps the browser's native bubble out of the way: `type="url"`
    // is there for the mobile keyboard, but Zod owns every validation message.
    <form
      noValidate
      onSubmit={handleSubmit}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex-1 space-y-4 overflow-auto p-6">
        <ItemFields
          idPrefix="item"
          typeSlug={item.type.slug}
          layout={layout}
          values={values}
          onChange={(patch) => setValues((prev) => ({ ...prev, ...patch }))}
          disabled={pending}
          size="drawer"
          titleInvalid={titleEmpty}
          tagsHint="Comma-separated. AI-suggested tags are managed separately."
        />

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border p-4">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={pending || titleEmpty}>
          {pending && <Loader2 className="animate-spin" />}
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  )
}
