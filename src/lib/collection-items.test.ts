import { describe, it, expect } from "vitest"
import { countItemsByType, groupCollectionItems } from "@/lib/collection-items"
import type { ItemWithMeta } from "@/lib/db/items"

const TYPES = {
  snippets: { name: "Snippet", slug: "snippets", icon: "Code", color: "#3b82f6" },
  links: { name: "Link", slug: "links", icon: "Link", color: "#10b981" },
  images: { name: "Image", slug: "images", icon: "Image", color: "#ec4899" },
  files: { name: "File", slug: "files", icon: "File", color: "#6b7280" },
}

function item(id: string, slug: keyof typeof TYPES): ItemWithMeta {
  return {
    id,
    title: id,
    content: null,
    url: null,
    language: null,
    isFavorite: false,
    isPinned: false,
    lastUsedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    fileUrl: null,
    fileName: null,
    fileSize: null,
    type: TYPES[slug],
    tags: [],
  }
}

const ids = (items: ItemWithMeta[]) => items.map((i) => i.id)

describe("groupCollectionItems", () => {
  it("puts images and files in their own groups and everything else in others", () => {
    const groups = groupCollectionItems([
      item("s1", "snippets"),
      item("i1", "images"),
      item("l1", "links"),
      item("f1", "files"),
    ])

    expect(ids(groups.images)).toEqual(["i1"])
    expect(ids(groups.files)).toEqual(["f1"])
    expect(ids(groups.others)).toEqual(["s1", "l1"])
  })

  it("preserves the query's order within each group", () => {
    const groups = groupCollectionItems([
      item("i2", "images"),
      item("s1", "snippets"),
      item("i1", "images"),
      item("f2", "files"),
      item("f1", "files"),
    ])

    expect(ids(groups.images)).toEqual(["i2", "i1"])
    expect(ids(groups.files)).toEqual(["f2", "f1"])
  })

  it("returns three empty groups for an empty collection", () => {
    expect(groupCollectionItems([])).toEqual({ images: [], files: [], others: [] })
  })
})

describe("countItemsByType", () => {
  it("counts per type, most common first", () => {
    // The most common type is seen last, so insertion order alone would fail.
    const counts = countItemsByType([
      item("i1", "images"),
      item("s1", "snippets"),
      item("l1", "links"),
      item("s2", "snippets"),
      item("l2", "links"),
      item("l3", "links"),
    ])

    expect(counts.map(({ type, count }) => [type.slug, count])).toEqual([
      ["links", 3],
      ["snippets", 2],
      ["images", 1],
    ])
  })

  it("keeps first-seen order for tied counts", () => {
    const counts = countItemsByType([
      item("f1", "files"),
      item("s1", "snippets"),
      item("i1", "images"),
    ])

    expect(counts.map(({ type }) => type.slug)).toEqual(["files", "snippets", "images"])
  })

  it("carries the type's icon and color for the header", () => {
    const [entry] = countItemsByType([item("i1", "images")])

    expect(entry.type).toEqual(TYPES.images)
  })

  it("returns nothing for no items", () => {
    expect(countItemsByType([])).toEqual([])
  })
})
