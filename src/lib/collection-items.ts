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
