"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CodeEditor } from "@/components/items/CodeEditor"
import { MarkdownEditor } from "@/components/items/MarkdownEditor"
import { Field } from "@/components/items/Field"
import { CollectionPicker } from "@/components/items/CollectionPicker"
import { fallbackLanguageForSlug } from "@/lib/monaco"
import { cn } from "@/lib/utils"
import type { ContentEditorKind, ItemFormLayout } from "@/lib/validation/item"

export interface ItemFieldValues {
  title: string
  description: string
  content: string
  language: string
  url: string
  tags: string
  collectionIds: string[]
}

/** Content field sizing: the create dialog is shorter than the drawer. */
const CONTENT_SIZES = {
  dialog: { minHeight: 180, rows: 8, className: "max-h-72" },
  drawer: { minHeight: 200, rows: 10, className: "max-h-96" },
} as const

interface ItemFieldsProps {
  /** Prefixes every field id, so the dialog and the drawer cannot collide. */
  idPrefix: string
  typeSlug: string
  layout: ItemFormLayout
  values: ItemFieldValues
  onChange: (patch: Partial<ItemFieldValues>) => void
  disabled?: boolean
  size: keyof typeof CONTENT_SIZES
  titlePlaceholder?: string
  titleInvalid?: boolean
  tagsHint: string
  /** The upload field, rendered where content would be; FILE types have no content. */
  fileField?: React.ReactNode
}

/**
 * The editable fields shared by the create and edit forms, shown or hidden per
 * the type's `ItemFormLayout`.
 */
export function ItemFields({
  idPrefix,
  typeSlug,
  layout,
  values,
  onChange,
  disabled,
  size,
  titlePlaceholder,
  titleInvalid,
  tagsHint,
  fileField,
}: ItemFieldsProps) {
  const id = (name: string) => `${idPrefix}-${name}`

  return (
    <>
      <Field label="Title" htmlFor={id("title")}>
        <Input
          id={id("title")}
          value={values.title}
          onChange={(e) => onChange({ title: e.target.value })}
          disabled={disabled}
          placeholder={titlePlaceholder}
          aria-invalid={titleInvalid}
          autoFocus
        />
      </Field>

      <Field label="Description" htmlFor={id("description")}>
        <Textarea
          id={id("description")}
          value={values.description}
          onChange={(e) => onChange({ description: e.target.value })}
          disabled={disabled}
          rows={2}
          placeholder="Optional short description"
        />
      </Field>

      {layout.content && (
        <ContentField
          id={id("content")}
          editor={layout.editor}
          typeSlug={typeSlug}
          value={values.content}
          // Live state, so retyping the language re-highlights immediately.
          language={values.language}
          onChange={(content) => onChange({ content })}
          disabled={disabled}
          size={size}
        />
      )}

      {layout.file && fileField}

      {layout.language && (
        <Field label="Language" htmlFor={id("language")}>
          <Input
            id={id("language")}
            value={values.language}
            onChange={(e) => onChange({ language: e.target.value })}
            disabled={disabled}
            placeholder="typescript"
          />
        </Field>
      )}

      {layout.url && (
        <Field label="URL" htmlFor={id("url")}>
          <Input
            id={id("url")}
            type="url"
            value={values.url}
            onChange={(e) => onChange({ url: e.target.value })}
            disabled={disabled}
            placeholder="https://example.com"
          />
        </Field>
      )}

      <Field label="Tags" htmlFor={id("tags")} hint={tagsHint}>
        <Input
          id={id("tags")}
          value={values.tags}
          onChange={(e) => onChange({ tags: e.target.value })}
          disabled={disabled}
          placeholder="react, hooks, patterns"
        />
      </Field>

      <CollectionPicker
        idPrefix={idPrefix}
        value={values.collectionIds}
        onChange={(collectionIds) => onChange({ collectionIds })}
        disabled={disabled}
      />
    </>
  )
}

interface ContentFieldProps {
  id: string
  editor: ContentEditorKind
  typeSlug: string
  value: string
  language: string
  onChange: (value: string) => void
  disabled?: boolean
  size: keyof typeof CONTENT_SIZES
}

/** Content input: Monaco for code, Write/Preview for markdown, else a textarea. */
function ContentField({
  id,
  editor,
  typeSlug,
  value,
  language,
  onChange,
  disabled,
  size,
}: ContentFieldProps) {
  const { minHeight, rows, className } = CONTENT_SIZES[size]

  if (editor === "code") {
    // Monaco's input is not labelable, so it names itself via `ariaLabel`.
    return (
      <Field label="Content">
        <CodeEditor
          ariaLabel="Content"
          value={value}
          language={language}
          fallbackLanguage={fallbackLanguageForSlug(typeSlug)}
          onChange={onChange}
          disabled={disabled}
          minHeight={minHeight}
        />
      </Field>
    )
  }

  return (
    <Field label="Content" htmlFor={id}>
      {editor === "markdown" ? (
        <MarkdownEditor
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          minHeight={minHeight}
        />
      ) : (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={rows}
          className={cn(className, "font-mono text-xs leading-relaxed")}
        />
      )}
    </Field>
  )
}
