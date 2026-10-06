import { describe, it, expect, vi, beforeEach } from "vitest"

const findFirst = vi.fn()
const update = vi.fn()
const deleteFn = vi.fn()
const create = vi.fn()
const groupBy = vi.fn()
const itemTypeFindFirst = vi.fn()
const itemTypeFindMany = vi.fn()

// items.ts imports the Prisma client at module scope; mocking it keeps the
// suite hermetic and offline.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    item: { findFirst, update, delete: deleteFn, create, groupBy },
    itemType: { findFirst: itemTypeFindFirst, findMany: itemTypeFindMany },
  },
}))

const {
  getItemById,
  updateItem,
  deleteItem,
  createItem,
  getSystemItemTypeById,
  getSystemItemTypes,
} = await import("@/lib/db/items")

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
  update.mockReset()
  deleteFn.mockReset()
  create.mockReset()
  groupBy.mockReset()
  itemTypeFindFirst.mockReset()
  itemTypeFindMany.mockReset()
})

const FIELDS = {
  title: "Renamed hook",
  description: "Updated description",
  content: "export function useDebounce() { return 1 }",
  language: "typescript",
  url: null,
  tags: ["react", "hooks"],
}

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

describe("updateItem", () => {
  it("scopes the update to the owning user", async () => {
    update.mockResolvedValue(itemRow())

    await updateItem("user_1", "item_1", FIELDS)

    expect(update).toHaveBeenCalledTimes(1)
    expect(update.mock.calls[0][0].where).toEqual({
      id: "item_1",
      userId: "user_1",
    })
  })

  it("writes the scalar fields without leaking the tag list into them", async () => {
    update.mockResolvedValue(itemRow())

    await updateItem("user_1", "item_1", FIELDS)

    const { data } = update.mock.calls[0][0]
    expect(data.title).toBe("Renamed hook")
    expect(data.description).toBe("Updated description")
    expect(data.content).toBe("export function useDebounce() { return 1 }")
    expect(data.language).toBe("typescript")
    expect(data.url).toBeNull()
    expect(data.tags).not.toEqual(["react", "hooks"])
  })

  it("replaces the tag set with connectOrCreate join rows", async () => {
    update.mockResolvedValue(itemRow())

    await updateItem("user_1", "item_1", FIELDS)

    const { tags } = update.mock.calls[0][0].data
    expect(tags.deleteMany).toEqual({})
    expect(tags.create).toEqual([
      { tag: { connectOrCreate: { where: { name: "react" }, create: { name: "react" } } } },
      { tag: { connectOrCreate: { where: { name: "hooks" }, create: { name: "hooks" } } } },
    ])
  })

  it("clears every tag when the list is empty", async () => {
    update.mockResolvedValue(itemRow({ tags: [] }))

    const result = await updateItem("user_1", "item_1", { ...FIELDS, tags: [] })

    const { tags } = update.mock.calls[0][0].data
    expect(tags.deleteMany).toEqual({})
    expect(tags.create).toEqual([])
    expect(result?.tags).toEqual([])
  })

  it("returns the updated item serialized as an ItemDetail", async () => {
    update.mockResolvedValue(itemRow({ title: "Renamed hook" }))

    const result = await updateItem("user_1", "item_1", FIELDS)

    expect(result?.title).toBe("Renamed hook")
    expect(result?.createdAt).toBe("2026-05-01T09:00:00.000Z")
    expect(result?.updatedAt).toBe("2026-05-02T09:00:00.000Z")
    expect(result?.tags).toEqual([{ name: "react" }, { name: "hooks" }])
    expect(result?.collections).toEqual([
      { id: "col_1", name: "React Patterns" },
      { id: "col_2", name: "Utilities" },
    ])
  })

  it("returns null when no row matches the id and user (Prisma P2025)", async () => {
    update.mockRejectedValue(Object.assign(new Error("Record not found"), { code: "P2025" }))

    await expect(updateItem("user_2", "item_1", FIELDS)).resolves.toBeNull()
  })

  it("rethrows errors that are not a missing record", async () => {
    update.mockRejectedValue(Object.assign(new Error("connection lost"), { code: "P1001" }))

    await expect(updateItem("user_1", "item_1", FIELDS)).rejects.toThrow("connection lost")
  })
})

describe("deleteItem", () => {
  const DELETED_ROW = {
    id: "item_1",
    title: "useDebounce hook",
    type: { slug: "snippets" },
  }

  it("scopes the delete by user id so a foreign item can't be removed", async () => {
    deleteFn.mockResolvedValue(DELETED_ROW)

    await deleteItem("user_1", "item_1")

    expect(deleteFn).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "item_1", userId: "user_1" } })
    )
  })

  it("returns the deleted item's id, title and type slug", async () => {
    deleteFn.mockResolvedValue(DELETED_ROW)

    const result = await deleteItem("user_1", "item_1")

    expect(result).toEqual({
      id: "item_1",
      title: "useDebounce hook",
      typeSlug: "snippets",
    })
  })

  it("deletes in one statement instead of looking the item up first", async () => {
    deleteFn.mockResolvedValue(DELETED_ROW)

    await deleteItem("user_1", "item_1")

    // The type slug comes back from the delete itself so the caller can
    // revalidate without a second round trip.
    expect(findFirst).not.toHaveBeenCalled()
    expect(deleteFn).toHaveBeenCalledTimes(1)
  })

  it("returns null when no row matches (missing or another user's item)", async () => {
    deleteFn.mockRejectedValue(Object.assign(new Error("not found"), { code: "P2025" }))

    await expect(deleteItem("user_1", "item_1")).resolves.toBeNull()
  })

  it("rethrows any other database error", async () => {
    deleteFn.mockRejectedValue(Object.assign(new Error("connection lost"), { code: "P1001" }))

    await expect(deleteItem("user_1", "item_1")).rejects.toThrow("connection lost")
  })
})

describe("getSystemItemTypeById", () => {
  it("only resolves system types, so a custom type id cannot be used", async () => {
    itemTypeFindFirst.mockResolvedValue(TYPE)

    await getSystemItemTypeById("type_1")

    expect(itemTypeFindFirst.mock.calls[0][0].where).toEqual({
      id: "type_1",
      isSystem: true,
    })
  })

  it("returns null when no system type matches", async () => {
    itemTypeFindFirst.mockResolvedValue(null)

    expect(await getSystemItemTypeById("type_nope")).toBeNull()
  })
})

const CREATE_FIELDS = {
  typeId: "type_1",
  title: "useDebounce hook",
  description: "A reusable React hook",
  content: "export function useDebounce() {}",
  language: "typescript",
  url: null,
  tags: ["react", "hooks"],
}

describe("createItem", () => {
  it("attaches the item to the given user", async () => {
    create.mockResolvedValue(itemRow())

    await createItem("user_1", CREATE_FIELDS)

    expect(create.mock.calls[0][0].data).toMatchObject({
      userId: "user_1",
      typeId: "type_1",
      title: "useDebounce hook",
    })
  })

  it("connects tags by name so existing rows are reused", async () => {
    create.mockResolvedValue(itemRow())

    await createItem("user_1", CREATE_FIELDS)

    expect(create.mock.calls[0][0].data.tags).toEqual({
      create: [
        { tag: { connectOrCreate: { where: { name: "react" }, create: { name: "react" } } } },
        { tag: { connectOrCreate: { where: { name: "hooks" }, create: { name: "hooks" } } } },
      ],
    })
  })

  it("creates no tag rows when the list is empty", async () => {
    create.mockResolvedValue(itemRow({ tags: [] }))

    await createItem("user_1", { ...CREATE_FIELDS, tags: [] })

    expect(create.mock.calls[0][0].data.tags).toEqual({ create: [] })
  })

  it("returns the created item serialized as an ItemDetail", async () => {
    create.mockResolvedValue(itemRow())

    const item = await createItem("user_1", CREATE_FIELDS)

    expect(item).toMatchObject({
      id: "item_1",
      createdAt: "2026-05-01T09:00:00.000Z",
      type: TYPE,
      tags: [{ name: "react" }, { name: "hooks" }],
      collections: [
        { id: "col_1", name: "React Patterns" },
        { id: "col_2", name: "Utilities" },
      ],
    })
  })

  it("lets database errors through — there is no ownership check to absorb", async () => {
    // updateItem and deleteItem map P2025 to null because a missing row means
    // "not yours". A create has no such row, so even P2025 is a real failure.
    create.mockRejectedValue(Object.assign(new Error("fk violation"), { code: "P2025" }))

    await expect(createItem("user_1", CREATE_FIELDS)).rejects.toThrow("fk violation")
  })
})

describe("getSystemItemTypes", () => {
  const TYPE_ROWS = [
    { id: "t_snip", name: "Snippet", slug: "snippets", icon: "Code", color: "#3b82f6", category: "TEXT", order: 0 },
    { id: "t_note", name: "Note", slug: "notes", icon: "StickyNote", color: "#fde047", category: "TEXT", order: 3 },
    { id: "t_file", name: "File", slug: "files", icon: "File", color: "#6b7280", category: "FILE", order: 4 },
  ]

  // `getSystemItemTypes` is cache()-wrapped, and React's cache memoizes per
  // argument. Each test uses its own user id so a result can never leak from
  // one test into the next, whatever the memoization does outside a render.
  let userSeq = 0
  function nextUser() {
    userSeq += 1
    return `user_types_${userSeq}`
  }

  beforeEach(() => {
    itemTypeFindMany.mockResolvedValue(TYPE_ROWS)
    groupBy.mockResolvedValue([])
  })

  it("returns only system types, in their configured order", async () => {
    const userId = nextUser()

    await getSystemItemTypes(userId)

    // Custom types belong to one user; the sidebar and the create dialog's
    // chips must never show another user's, so the filter is not optional.
    expect(itemTypeFindMany).toHaveBeenCalledWith({
      where: { isSystem: true },
      orderBy: { order: "asc" },
    })
  })

  it("counts only the given user's items", async () => {
    const userId = nextUser()

    await getSystemItemTypes(userId)

    expect(groupBy).toHaveBeenCalledWith({
      by: ["typeId"],
      where: { userId },
      _count: true,
    })
  })

  it("maps each type's count from the grouped totals", async () => {
    const userId = nextUser()
    groupBy.mockResolvedValue([
      { typeId: "t_snip", _count: 7 },
      { typeId: "t_note", _count: 2 },
    ])

    const result = await getSystemItemTypes(userId)

    expect(result.map((t) => [t.slug, t.count])).toEqual([
      ["snippets", 7],
      ["notes", 2],
      ["files", 0],
    ])
  })

  it("reports zero rather than undefined for a type with no items", async () => {
    const userId = nextUser()
    groupBy.mockResolvedValue([])

    const result = await getSystemItemTypes(userId)

    expect(result.every((t) => t.count === 0)).toBe(true)
    expect(result.some((t) => t.count === undefined)).toBe(false)
  })

  it("ignores counts for types that are not in the system list", async () => {
    const userId = nextUser()
    groupBy.mockResolvedValue([
      { typeId: "t_snip", _count: 3 },
      { typeId: "t_deleted", _count: 99 },
    ])

    const result = await getSystemItemTypes(userId)

    expect(result).toHaveLength(TYPE_ROWS.length)
    expect(result.find((t) => t.slug === "snippets")?.count).toBe(3)
  })

  it("returns the fields the sidebar and the create dialog's chips read", async () => {
    const userId = nextUser()

    const [first] = await getSystemItemTypes(userId)

    // `category` is what CreateItemDialog filters FILE types on, and `id` is
    // what /items/[type] passes as the preselected type.
    expect(first).toEqual({
      id: "t_snip",
      name: "Snippet",
      slug: "snippets",
      icon: "Code",
      color: "#3b82f6",
      category: "TEXT",
      count: 0,
    })
  })

  it("exposes every FILE type so the dialog has something to filter out", async () => {
    const userId = nextUser()

    const result = await getSystemItemTypes(userId)

    // The query must not pre-filter FILE types: the sidebar still lists them
    // (with a PRO badge) and only the create dialog drops them.
    expect(result.some((t) => t.category === "FILE")).toBe(true)
  })
})
