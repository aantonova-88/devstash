import { describe, it, expect, vi, beforeEach } from "vitest"

const findFirst = vi.fn()

// items.ts imports the Prisma client at module scope; mocking it keeps the
// suite hermetic and offline.
vi.mock("@/lib/prisma", () => ({ prisma: { item: { findFirst } } }))

const { getItemById } = await import("@/lib/db/items")

const TYPE = {
  id: "type_1",
  name: "Snippet",
  slug: "snippets",
  icon: "Code",
  color: "#3b82f6",
  category: "TEXT",
}

function itemRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "item_1",
    title: "useDebounce hook",
    description: "A reusable React hook",
    content: "export function useDebounce() {}",
    url: null,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    language: "typescript",
    isFavorite: true,
    isPinned: false,
    aiSummary: null,
    aiTags: ["debounce"],
    lastUsedAt: new Date("2026-05-03T10:00:00.000Z"),
    createdAt: new Date("2026-05-01T09:00:00.000Z"),
    updatedAt: new Date("2026-05-02T09:00:00.000Z"),
    type: TYPE,
    tags: [{ tag: { name: "react" } }, { tag: { name: "hooks" } }],
    collections: [
      { collection: { id: "col_1", name: "React Patterns" } },
      { collection: { id: "col_2", name: "Utilities" } },
    ],
    ...overrides,
  }
}

beforeEach(() => {
  findFirst.mockReset()
})

describe("getItemById", () => {
  it("scopes the query to the owning user", async () => {
    findFirst.mockResolvedValue(itemRow())

    await getItemById("user_1", "item_1")

    expect(findFirst).toHaveBeenCalledTimes(1)
    expect(findFirst.mock.calls[0][0].where).toEqual({
      id: "item_1",
      userId: "user_1",
    })
  })

  it("returns null when the item is missing or owned by someone else", async () => {
    findFirst.mockResolvedValue(null)

    await expect(getItemById("user_1", "item_1")).resolves.toBeNull()
  })

  it("serializes dates to ISO strings", async () => {
    findFirst.mockResolvedValue(itemRow())

    const item = await getItemById("user_1", "item_1")

    expect(item?.lastUsedAt).toBe("2026-05-03T10:00:00.000Z")
    expect(item?.createdAt).toBe("2026-05-01T09:00:00.000Z")
    expect(item?.updatedAt).toBe("2026-05-02T09:00:00.000Z")
  })

  it("keeps a null lastUsedAt null", async () => {
    findFirst.mockResolvedValue(itemRow({ lastUsedAt: null }))

    const item = await getItemById("user_1", "item_1")

    expect(item?.lastUsedAt).toBeNull()
  })

  it("flattens the tag and collection join rows", async () => {
    findFirst.mockResolvedValue(itemRow())

    const item = await getItemById("user_1", "item_1")

    expect(item?.tags).toEqual([{ name: "react" }, { name: "hooks" }])
    expect(item?.collections).toEqual([
      { id: "col_1", name: "React Patterns" },
      { id: "col_2", name: "Utilities" },
    ])
  })

  it("handles an item with no tags or collections", async () => {
    findFirst.mockResolvedValue(itemRow({ tags: [], collections: [], aiTags: [] }))

    const item = await getItemById("user_1", "item_1")

    expect(item?.tags).toEqual([])
    expect(item?.collections).toEqual([])
    expect(item?.aiTags).toEqual([])
  })

  it("passes through the type summary and content fields", async () => {
    findFirst.mockResolvedValue(
      itemRow({
        content: null,
        url: "https://example.com",
        language: null,
      }),
    )

    const item = await getItemById("user_1", "item_1")

    expect(item?.type).toEqual(TYPE)
    expect(item?.content).toBeNull()
    expect(item?.url).toBe("https://example.com")
    expect(item?.language).toBeNull()
  })
})
