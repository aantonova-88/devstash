"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { File, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createItem } from "@/actions/items"
import { CodeEditor } from "@/components/items/CodeEditor"
import { Field } from "@/components/items/Field"
import { ICON_MAP } from "@/lib/icons"
import { fallbackLanguageForSlug } from "@/lib/monaco"
import { cn } from "@/lib/utils"
import { LANGUAGE_SLUGS, parseTagInput } from "@/lib/validation/item"
import type { SidebarItemType } from "@/lib/db/items"

interface CreateItemFormProps {
  /** Selectable types, already filtered to those this form can create. */
  types: SidebarItemType[]
  onCancel: () => void
  onCreated: () => void
}

/**
 * New-item form for the create dialog. Controlled inputs with local state and
 * no form library, matching `ItemEditForm`; the difference is the type selector,
 * which decides which content fields are shown.
 */
export function CreateItemForm({ types, onCancel, onCreated }: CreateItemFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [typeId, setTypeId] = useState(types[0].id)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [content, setContent] = useState("")
  const [language, setLanguage] = useState("")
  const [url, setUrl] = useState("")
  const [tags, setTags] = useState("")

  const type = types.find((t) => t.id === typeId) ?? types[0]
  const showContent = type.category === "TEXT"
  const showUrl = type.category === "URL"
  // The types that carry a language are exactly the code-bearing ones
  // (snippets, commands), so the same set decides who gets the code editor.
  const isCodeType = LANGUAGE_SLUGS.has(type.slug)
  const showLanguage = isCodeType

  // Mirrors the server's own requirements so the button reflects them; the
  // action re-checks both against the type it resolves from the database.
  const incomplete = title.trim() === "" || (showUrl && url.trim() === "")

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await createItem({
        typeId,
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

      toast.success(`${result.data.title} created`)
      onCreated()
      // Refreshes the server-rendered card grids and sidebar counts.
      router.refresh()
    })
  }

  return (
    // noValidate for the same reason as the edit form: `type="url"` is there for
    // the mobile keyboard, but Zod owns every validation message.
    <form
      noValidate
      onSubmit={handleSubmit}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-auto px-1 pb-1">
        <div className="space-y-1.5">
          <Label
            id="new-item-type-label"
            className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
          >
            Type
          </Label>
          <div
            role="radiogroup"
            aria-labelledby="new-item-type-label"
            className="flex flex-wrap gap-1.5"
          >
            {types.map((t) => {
              const Icon = ICON_MAP[t.icon] ?? File
              const selected = t.id === typeId

              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={pending}
                  onClick={() => setTypeId(t.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] font-semibold tracking-wider uppercase transition-colors",
                    "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    "disabled:pointer-events-none disabled:opacity-50",
                    selected
                      ? "border-transparent"
                      : "border-border text-muted-foreground hover:bg-muted/60"
                  )}
                  style={
                    selected
                      ? { color: t.color, backgroundColor: `${t.color}20` }
                      : undefined
                  }
                >
                  <Icon className="h-3 w-3" />
                  {t.name}
                </button>
              )
            })}
          </div>
        </div>

        <Field label="Title" htmlFor="new-item-title">
          <Input
            id="new-item-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={pending}
            placeholder={`Name this ${type.name.toLowerCase()}`}
            autoFocus
          />
        </Field>

        <Field label="Description" htmlFor="new-item-description">
          <Textarea
            id="new-item-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={pending}
            rows={2}
            placeholder="Optional short description"
          />
        </Field>

        {showContent && (
          <Field label="Content" htmlFor={isCodeType ? undefined : "new-item-content"}>
            {isCodeType ? (
              <CodeEditor
                ariaLabel="Content"
                value={content}
                // Live state, so retyping the language re-highlights immediately.
                language={language}
                fallbackLanguage={fallbackLanguageForSlug(type.slug)}
                onChange={setContent}
                disabled={pending}
                minHeight={180}
              />
            ) : (
              <Textarea
                id="new-item-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={pending}
                rows={8}
                className="max-h-72 font-mono text-xs leading-relaxed"
              />
            )}
          </Field>
        )}

        {showLanguage && (
          <Field label="Language" htmlFor="new-item-language">
            <Input
              id="new-item-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={pending}
              placeholder="typescript"
            />
          </Field>
        )}

        {showUrl && (
          <Field label="URL" htmlFor="new-item-url">
            <Input
              id="new-item-url"
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
          htmlFor="new-item-tags"
          hint="Comma-separated."
        >
          <Input
            id="new-item-tags"
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
        <Button type="submit" className="flex-1" disabled={pending || incomplete}>
          {pending && <Loader2 className="animate-spin" />}
          {pending ? "Creating…" : "Create item"}
        </Button>
      </div>
    </form>
  )
}
