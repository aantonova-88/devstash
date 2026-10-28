import type { ItemWithMeta } from "@/lib/db/items"

export interface CollectionItemGroups {
  images: ItemWithMeta[]
  files: ItemWithMeta[]
  others: ItemWithMeta[]
}

/**
 * Split a collection's items into the page's three blocks: images and files get
 * the gallery and list layouts their type pages use, everything else the card
 * grid. Order within each block is preserved.
 */
export function groupCollectionItems(items: ItemWithMeta[]): CollectionItemGroups {
  const groups: CollectionItemGroups = { images: [], files: [], others: [] }
  for (const item of items) {
    if (item.type.slug === "images") groups.images.push(item)
    else if (item.type.slug === "files") groups.files.push(item)
    else groups.others.push(item)
  }
  return groups
}

export interface TypeCount {
  type: ItemWithMeta["type"]
  count: number
}

/** Per-type item counts, most common first; ties keep first-seen order. */
export function countItemsByType(items: ItemWithMeta[]): TypeCount[] {
  const counts = new Map<string, TypeCount>()
  for (const item of items) {
    const entry = counts.get(item.type.slug)
    if (entry) entry.count++
    else counts.set(item.type.slug, { type: item.type, count: 1 })
  }
  return [...counts.values()].sort((a, b) => b.count - a.count)
}
