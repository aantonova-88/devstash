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
}

export const updateItemSchema = z.object(itemFields)

export type UpdateItemInput = z.input<typeof updateItemSchema>
export type UpdateItemData = z.output<typeof updateItemSchema>

export const createItemSchema = z.object({
  typeId: z.string().trim().min(1, "Select an item type"),
  ...itemFields,
})

export type CreateItemInput = z.input<typeof createItemSchema>
export type CreateItemData = z.output<typeof createItemSchema>

/** Types whose `language` column is meaningful. */
export const LANGUAGE_SLUGS = new Set(["snippets", "commands"])

export interface ItemTypeShape {
  slug: string
  category: string
}

export interface ContentFields {
  content: string | null
  url: string | null
  language: string | null
}

export type ContentFieldsResult =
  | { ok: true; fields: ContentFields }
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
  data: Pick<CreateItemData, "content" | "url" | "language">
): ContentFieldsResult {
  if (type.category === "FILE") {
    return { ok: false, error: "File and image items are not supported yet." }
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
