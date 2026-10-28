import { z } from "zod"

/**
 * Optional text field: trims, and normalises an empty string to null so a
 * cleared input clears the column rather than storing "".
 */
const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .default(null)

/**
 * The editable fields every item shares. Create and update take the same set —
 * create additionally names the type it belongs to.
 */
const itemFields = {
  title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"),
  description: optionalText,
  content: optionalText,
  language: optionalText,
  url: optionalText.refine(
    (value) => value === null || z.url({ protocol: /^https?$/ }).safeParse(value).success,
    "Enter a valid URL starting with http:// or https://"
  ),
  tags: z
    .array(z.string().trim().min(1, "Tags cannot be empty"))
    .max(20, "An item can have at most 20 tags")
    .default([]),
  collectionIds: z
    .array(z.string().trim().min(1, "Invalid collection"))
    .max(100, "Too many collections")
    .default([])
    .transform((ids) => [...new Set(ids)]),
}

export const updateItemSchema = z.object(itemFields)

export type UpdateItemInput = z.input<typeof updateItemSchema>
export type UpdateItemData = z.output<typeof updateItemSchema>

export const createItemSchema = z.object({
  typeId: z.string().trim().min(1, "Select an item type"),
  ...itemFields,
  /**
   * Storage key returned by `/api/upload`, for File and Image items. Only the
   * key is accepted — the name and size are read back from R2, not the client.
   */
  fileKey: z.string().trim().min(1).max(512).nullable().default(null),
})

export type CreateItemInput = z.input<typeof createItemSchema>
export type CreateItemData = z.output<typeof createItemSchema>

/** Types whose `language` column is meaningful. */
export const LANGUAGE_SLUGS = new Set(["snippets", "commands"])

/** Types whose content is written and rendered as Markdown. */
export const MARKDOWN_SLUGS = new Set(["notes", "prompts"])

export type ContentEditorKind = "code" | "markdown" | "plain"

/**
 * Which editor a TEXT type's content gets. Code wins over markdown so a slug
 * can never land in both; anything in neither set keeps the plain textarea.
 */
export function contentEditorFor(slug: string): ContentEditorKind {
  if (LANGUAGE_SLUGS.has(slug)) return "code"
  if (MARKDOWN_SLUGS.has(slug)) return "markdown"
  return "plain"
}

export interface ItemTypeShape {
  slug: string
  category: string
}

export interface ItemFormLayout {
  content: boolean
  url: boolean
  language: boolean
  file: boolean
  /** Which editor the content field uses; meaningful only when `content` is shown. */
  editor: ContentEditorKind
}

/**
 * Which fields the create and edit forms show for a type. This is the client's
 * mirror of `contentFieldsForType` — a convenience only, since the server drops
 * whatever the resolved type does not accept.
 */
export function formLayoutForType(type: ItemTypeShape): ItemFormLayout {
  const editor = contentEditorFor(type.slug)

  return {
    content: type.category === "TEXT",
    url: type.category === "URL",
    // The types that carry a language are exactly the code-bearing ones
    // (snippets, commands), so the same set decides who gets the code editor.
    language: editor === "code",
    file: type.category === "FILE",
    editor,
  }
}

export interface ContentFields {
  content: string | null
  url: string | null
  language: string | null
}

export type ContentFieldsResult =
  | {
      ok: true
      fields: ContentFields
      /** Upload to attach; set only for FILE types, which always require one. */
      fileKey: string | null
    }
  | { ok: false; error: string }

/**
 * Decide which content fields an item type actually accepts, and reject input
 * the type cannot satisfy.
 *
 * The type is resolved from the database, never taken from the request, so this
 * is the server's own answer to "what may this item hold" — fields the type
 * does not use are dropped rather than trusted from the client, which only
 * hides them as a convenience.
 */
export function contentFieldsForType(
  type: ItemTypeShape,
  data: Pick<CreateItemData, "content" | "url" | "language" | "fileKey">
): ContentFieldsResult {
  if (type.category === "FILE") {
    if (data.fileKey === null) {
      return { ok: false, error: "Upload a file for this item type." }
    }
    return {
      ok: true,
      fields: { content: null, url: null, language: null },
      fileKey: data.fileKey,
    }
  }

  const isUrl = type.category === "URL"
  if (isUrl && data.url === null) {
    return { ok: false, error: "A URL is required for this item type." }
  }

  return {
    ok: true,
    fields: {
      content: isUrl ? null : data.content,
      url: isUrl ? data.url : null,
      language: LANGUAGE_SLUGS.has(type.slug) ? data.language : null,
    },
    fileKey: null,
  }
}

/**
 * Splits the drawer's comma-separated tag input into a deduplicated list.
 * Case-insensitive on dedup because `Tag.name` is globally unique.
 */
export function parseTagInput(value: string): string[] {
  const seen = new Set<string>()
  const tags: string[] = []

  for (const raw of value.split(",")) {
    const tag = raw.trim()
    if (!tag) continue

    const key = tag.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    tags.push(tag)
  }

  return tags
}
