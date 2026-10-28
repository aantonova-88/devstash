"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createItem } from "@/actions/items"
import { Field } from "@/components/items/Field"
import { FileUpload, type UploadedFile } from "@/components/items/FileUpload"
import { ItemFields, type ItemFieldValues } from "@/components/items/ItemFields"
import { TypeChips } from "@/components/items/TypeChips"
import { isFileTypeSlug } from "@/lib/validation/file"
import { formLayoutForType, parseTagInput } from "@/lib/validation/item"
import type { SidebarItemType } from "@/lib/db/items"

interface CreateItemFormProps {
  /** Selectable types, shown as chips. */
  types: SidebarItemType[]
  /** Type to start on — the one whose page opened the dialog. */
  initialTypeId?: string
  onCancel: () => void
  onCreated: () => void
}

const EMPTY_VALUES: ItemFieldValues = {
  title: "",
  description: "",
  content: "",
  language: "",
  url: "",
  tags: "",
  collectionIds: [],
}

/**
 * New-item form for the create dialog. Controlled inputs with local state and
 * no form library, matching `ItemEditForm`; the difference is the type selector,
 * which decides which content fields are shown.
 */
export function CreateItemForm({
  types,
  initialTypeId,
  onCancel,
  onCreated,
}: CreateItemFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // `typeId` is submitted as-is, so it must always name one of `types`. An
  // `initialTypeId` naming a type not in the list would otherwise be sent to
  // the server and rejected, so fall back instead.
  const [typeId, setTypeId] = useState(
    () => types.find((t) => t.id === initialTypeId)?.id ?? types[0].id,
  )
  const [values, setValues] = useState(EMPTY_VALUES)
  // Remembered with the slug it was uploaded for: an image's key is rejected for
  // a File item, so switching chips must drop it rather than submit it.
  const [upload, setUpload] = useState<{ slug: string; file: UploadedFile } | null>(null)
  const [uploading, setUploading] = useState(false)

  const type = types.find((t) => t.id === typeId) ?? types[0]
  const layout = formLayoutForType(type)
  const fileSlug = layout.file && isFileTypeSlug(type.slug) ? type.slug : null
  const uploadedFile = upload?.slug === type.slug ? upload.file : null

  // Mirrors the server's own requirements so the button reflects them; the
  // action re-checks both against the type it resolves from the database.
  const incomplete =
    values.title.trim() === "" ||
    (layout.url && values.url.trim() === "") ||
    (fileSlug !== null && uploadedFile === null)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await createItem({
        typeId,
        title: values.title,
        description: values.description,
        content: layout.content ? values.content : null,
        language: layout.language ? values.language : null,
        url: layout.url ? values.url : null,
        fileKey: fileSlug ? (uploadedFile?.key ?? null) : null,
        tags: parseTagInput(values.tags),
        collectionIds: values.collectionIds,
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
        <TypeChips
          types={types}
          value={typeId}
          onChange={setTypeId}
          disabled={pending || uploading}
        />

        <ItemFields
          idPrefix="new-item"
          typeSlug={type.slug}
          layout={layout}
          values={values}
          onChange={(patch) => setValues((prev) => ({ ...prev, ...patch }))}
          disabled={pending}
          size="dialog"
          titlePlaceholder={`Name this ${type.name.toLowerCase()}`}
          tagsHint="Comma-separated."
          fileField={
            fileSlug && (
              <Field label={fileSlug === "images" ? "Image" : "File"}>
                <FileUpload
                  key={fileSlug}
                  slug={fileSlug}
                  value={uploadedFile}
                  onChange={(file) => setUpload(file ? { slug: fileSlug, file } : null)}
                  onUploadingChange={setUploading}
                  disabled={pending}
                />
              </Field>
            )
          }
        />

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
        <Button type="submit" className="flex-1" disabled={pending || uploading || incomplete}>
          {pending && <Loader2 className="animate-spin" />}
          {pending ? "Creating…" : "Create item"}
        </Button>
      </div>
    </form>
  )
}
