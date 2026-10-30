/** Longest content excerpt sent to the client for searching. */
export const SEARCH_PREVIEW_LENGTH = 120

/**
 * Collapse whitespace (newlines included) to single spaces and cut to `max`
 * characters with an ellipsis. Returns null when nothing is left.
 */
export function contentPreview(
  text: string | null | undefined,
  max = SEARCH_PREVIEW_LENGTH
): string | null {
  const collapsed = (text ?? "").replace(/\s+/g, " ").trim()
  if (collapsed === "") return null
  if (collapsed.length <= max) return collapsed
  return `${collapsed.slice(0, max).trimEnd()}…`
}

/**
 * The searchable excerpt for an item: its text content, else its URL, else its
 * original file name — whichever field the item's category populates.
 */
export function searchPreview(fields: {
  content: string | null
  url: string | null
  fileName: string | null
}): string | null {
  return contentPreview(fields.content) ?? contentPreview(fields.url) ?? contentPreview(fields.fileName)
}

function normalize(text: string): string {
  return text.toLocaleLowerCase().replace(/\s+/g, " ").trim()
}

/**
 * cmdk filter for the command palette. `keywords[0]` is the entry's name (item
 * title or collection name); any further keywords (type name, excerpt) are
 * searched too but rank lower.
 *
 * Every whitespace-separated word of the query must appear somewhere, in any
 * order. This deliberately replaces cmdk's default letter-by-letter fuzzy
 * score: that accepts the query's letters scattered anywhere in order, so a
 * 120-character excerpt matched almost any short query ("test" hit "Edi**t**ed
 * Saved ... **t**hrough"), and its scores for scattered noise and for genuine
 * abbreviations overlapped, so no threshold separated them.
 *
 * The entry's `value` is ignored: it must be unique, so it carries the record
 * id, which would otherwise be matched against the query.
 */
export function paletteFilter(_value: string, search: string, keywords?: string[]): number {
  const query = normalize(search)
  if (query === "") return 1

  const [name = "", ...rest] = (keywords ?? []).map(normalize)
  const haystack = [name, ...rest].join(" ")
  const terms = query.split(" ")

  if (!terms.every((term) => haystack.includes(term))) return 0
  if (name.startsWith(query)) return 1
  if (terms.every((term) => name.includes(term))) return 0.8
  return 0.3
}
