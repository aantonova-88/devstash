"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { updateItem } from "@/actions/items"
import { Field } from "@/components/items/Field"
import { LANGUAGE_SLUGS, parseTagInput } from "@/lib/validation/item"
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

  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.description ?? "")
  const [content, setContent] = useState(item.content ?? "")
  const [language, setLanguage] = useState(item.language ?? "")
  const [url, setUrl] = useState(item.url ?? "")
  const [tags, setTags] = useState(item.tags.map((t) => t.name).join(", "))

  const showContent = item.type.category === "TEXT"
  const showUrl = item.type.category === "URL"
  const showLanguage = LANGUAGE_SLUGS.has(item.type.slug)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await updateItem(item.id, {
        title,
        description,
        content: showContent ? content : null,
        language: showLanguage ? language : null,
        url: showUrl ? url : null,
        tags: parseTagInput(tags),
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
        <Field label="Title" htmlFor="item-title">
          <Input
            id="item-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={pending}
            aria-invalid={title.trim() === ""}
            autoFocus
          />
        </Field>

        <Field label="Description" htmlFor="item-description">
          <Textarea
            id="item-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={pending}
            rows={2}
            placeholder="Optional short description"
          />
        </Field>

        {showContent && (
          <Field label="Content" htmlFor="item-content">
            <Textarea
              id="item-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={pending}
              rows={10}
              className="max-h-96 font-mono text-xs leading-relaxed"
            />
          </Field>
        )}

        {showLanguage && (
          <Field label="Language" htmlFor="item-language">
            <Input
              id="item-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={pending}
              placeholder="typescript"
            />
          </Field>
        )}

        {showUrl && (
          <Field label="URL" htmlFor="item-url">
            <Input
              id="item-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={pending}
              placeholder="https://example.com"
            />
          </Field>
        )}

        <Field
          label="Tags"
          htmlFor="item-tags"
          hint="Comma-separated. AI-suggested tags are managed separately."
        >
          <Input
            id="item-tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            disabled={pending}
            placeholder="react, hooks, patterns"
          />
        </Field>

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
        <Button type="submit" className="flex-1" disabled={pending || title.trim() === ""}>
          {pending && <Loader2 className="animate-spin" />}
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  )
}
