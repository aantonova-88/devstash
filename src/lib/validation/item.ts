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

export const updateItemSchema = z.object({
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
})

export type UpdateItemInput = z.input<typeof updateItemSchema>
export type UpdateItemData = z.output<typeof updateItemSchema>

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
