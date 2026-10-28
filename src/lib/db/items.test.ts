import { describe, it, expect, vi, beforeEach } from "vitest"

const findFirst = vi.fn()
const findMany = vi.fn()
const update = vi.fn()
const deleteFn = vi.fn()
const create = vi.fn()
const groupBy = vi.fn()
const itemTypeFindFirst = vi.fn()
const itemTypeFindMany = vi.fn()
const itemCount = vi.fn()
const collectionCount = vi.fn()

// items.ts imports the Prisma client at module scope; mocking it keeps the
// suite hermetic and offline.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    item: { findFirst, findMany, update, delete: deleteFn, create, groupBy, count: itemCount },
    itemType: { findFirst: itemTypeFindFirst, findMany: itemTypeFindMany },
    collection: { count: collectionCount },
  },
}))

const {
  getItemById,
  updateItem,
  deleteItem,
  createItem,
  getSystemItemTypeById,
  getSystemItemTypes,
  getItemFile,
  getItemsByType,
  getProfileStats,
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
  findMany.mockReset()
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
  collectionIds: ["col_1", "col_2"],
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

  it("exposes a file as its proxy URL, never the private R2 key", async () => {
    findFirst.mockResolvedValue(
      itemRow({ fileUrl: "user_1/files/abc.pdf", fileName: "spec.pdf", fileSize: 2048 }),
    )

    const item = await getItemById("user_1", "item_1")

    expect(item?.fileUrl).toBe("/api/items/item_1/file")
    expect(JSON.stringify(item)).not.toContain("user_1/files/abc.pdf")
    expect(item?.fileName).toBe("spec.pdf")
    expect(item?.fileSize).toBe(2048)
  })

  it("keeps fileUrl null for an item with no file", async () => {
    findFirst.mockResolvedValue(itemRow())

    const item = await getItemById("user_1", "item_1")

    expect(item?.fileUrl).toBeNull()
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

  it("writes the collection ids only as join rows, not as a scalar", async () => {
    update.mockResolvedValue(itemRow())

    await updateItem("user_1", "item_1", FIELDS)

    expect(update.mock.calls[0][0].data).not.toHaveProperty("collectionIds")
  })

  it("removes only the memberships that are no longer selected", async () => {
    update.mockResolvedValue(itemRow())

    await updateItem("user_1", "item_1", FIELDS)

    expect(update.mock.calls[0][0].data.collections.deleteMany).toEqual({
      collectionId: { notIn: ["col_1", "col_2"] },
    })
  })

  it("upserts kept memberships unchanged so their addedAt survives", async () => {
    update.mockResolvedValue(itemRow())

    await updateItem("user_1", "item_1", FIELDS)

    expect(update.mock.calls[0][0].data.collections.upsert).toEqual([
      {
        where: { itemId_collectionId: { itemId: "item_1", collectionId: "col_1" } },
        create: { collection: { connect: { id: "col_1" } } },
        update: {},
      },
      {
        where: { itemId_collectionId: { itemId: "item_1", collectionId: "col_2" } },
        create: { collection: { connect: { id: "col_2" } } },
        update: {},
      },
    ])
  })

  it("removes every membership when no collections are selected", async () => {
    update.mockResolvedValue(itemRow({ collections: [] }))

    await updateItem("user_1", "item_1", { ...FIELDS, collectionIds: [] })

    expect(update.mock.calls[0][0].data.collections).toEqual({
      deleteMany: { collectionId: { notIn: [] } },
      upsert: [],
    })
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
    fileUrl: null,
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
      fileKey: null,
    })
  })

  it("returns the R2 key of a deleted file item so the object can be removed", async () => {
    deleteFn.mockResolvedValue({
      ...DELETED_ROW,
      fileUrl: "user_1/files/abc.pdf",
      type: { slug: "files" },
    })

    const result = await deleteItem("user_1", "item_1")

    expect(result?.fileKey).toBe("user_1/files/abc.pdf")
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
  fileUrl: null,
  fileName: null,
  fileSize: null,
  tags: ["react", "hooks"],
  collectionIds: ["col_1"],
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

  it("stores the file fields it is given", async () => {
    create.mockResolvedValue(itemRow())

    await createItem("user_1", {
      ...CREATE_FIELDS,
      fileUrl: "user_1/files/abc.pdf",
      fileName: "spec.pdf",
      fileSize: 2048,
    })

    expect(create.mock.calls[0][0].data).toMatchObject({
      fileUrl: "user_1/files/abc.pdf",
      fileName: "spec.pdf",
      fileSize: 2048,
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

  it("connects the given collections as join rows", async () => {
    create.mockResolvedValue(itemRow())

    await createItem("user_1", CREATE_FIELDS)

    const { data } = create.mock.calls[0][0]
    expect(data).not.toHaveProperty("collectionIds")
    expect(data.collections).toEqual({
      create: [{ collection: { connect: { id: "col_1" } } }],
    })
  })

  it("creates no memberships when no collections are selected", async () => {
    create.mockResolvedValue(itemRow())

    await createItem("user_1", { ...CREATE_FIELDS, collectionIds: [] })

    expect(create.mock.calls[0][0].data.collections).toEqual({ create: [] })
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

describe("getItemFile", () => {
  it("scopes the lookup to the owning user", async () => {
    findFirst.mockResolvedValue({ fileUrl: "user_1/files/abc.pdf", fileName: "spec.pdf" })

    await getItemFile("user_1", "item_1")

    expect(findFirst.mock.calls[0][0].where).toEqual({ id: "item_1", userId: "user_1" })
  })

  it("returns the key and name", async () => {
    findFirst.mockResolvedValue({ fileUrl: "user_1/files/abc.pdf", fileName: "spec.pdf" })

    await expect(getItemFile("user_1", "item_1")).resolves.toEqual({
      key: "user_1/files/abc.pdf",
      fileName: "spec.pdf",
    })
  })

  it("returns null for a missing or foreign item", async () => {
    findFirst.mockResolvedValue(null)

    await expect(getItemFile("user_1", "item_1")).resolves.toBeNull()
  })

  it("returns null for an item that has no file", async () => {
    findFirst.mockResolvedValue({ fileUrl: null, fileName: null })

    await expect(getItemFile("user_1", "item_1")).resolves.toBeNull()
  })
})

describe("getItemsByType (card serialization)", () => {
  const IMAGE_TYPE = { name: "Image", slug: "images", icon: "Image", color: "#ec4899" }

  // What Prisma actually returns for the card include: every scalar column
  // plus join rows that carry their own foreign keys.
  function cardRow(overrides: Record<string, unknown> = {}) {
    return {
      ...itemRow(),
      userId: "user_1",
      typeId: "type_1",
      type: { name: TYPE.name, slug: TYPE.slug, icon: TYPE.icon, color: TYPE.color },
      tags: [{ itemId: "item_1", tagId: "tag_1", tag: { name: "react" } }],
      ...overrides,
    }
  }

  it("scopes the query to the user and type and selects the type slug", async () => {
    findMany.mockResolvedValue([])

    await getItemsByType("user_1", "type_1")

    const args = findMany.mock.calls[0][0]
    expect(args.where).toEqual({ userId: "user_1", typeId: "type_1" })
    expect(args.include.type.select).toEqual({
      name: true,
      slug: true,
      icon: true,
      color: true,
    })
  })

  it("maps a stored file to the proxy URL, never the R2 key", async () => {
    findMany.mockResolvedValue([
      cardRow({ type: IMAGE_TYPE, fileUrl: "user_1/images/abc.png", fileName: "a.png" }),
    ])

    const [item] = await getItemsByType("user_1", "type_1")

    expect(item.fileUrl).toBe("/api/items/item_1/file")
    expect(JSON.stringify(item)).not.toContain("user_1/images/abc.png")
  })

  it("passes the original file name and size through for list rows", async () => {
    findMany.mockResolvedValue([
      cardRow({ fileUrl: "user_1/files/abc.pdf", fileName: "spec.pdf", fileSize: 2048 }),
    ])

    const [item] = await getItemsByType("user_1", "type_1")

    expect(item.fileName).toBe("spec.pdf")
    expect(item.fileSize).toBe(2048)
  })

  it("passes a link's url through so the card can copy it", async () => {
    findMany.mockResolvedValue([cardRow({ url: "https://example.com" })])

    const [item] = await getItemsByType("user_1", "type_1")

    expect(item.url).toBe("https://example.com")
  })

  it("returns a null fileUrl for items without a file", async () => {
    findMany.mockResolvedValue([cardRow()])

    const [item] = await getItemsByType("user_1", "type_1")

    expect(item.fileUrl).toBeNull()
  })

  it("does not pass private or unused columns through to the client", async () => {
    findMany.mockResolvedValue([
      cardRow({ type: IMAGE_TYPE, fileUrl: "user_1/images/abc.png", fileSize: 42 }),
    ])

    const [item] = await getItemsByType("user_1", "type_1")

    expect(Object.keys(item).sort()).toEqual(
      [
        "content",
        "createdAt",
        "fileName",
        "fileSize",
        "fileUrl",
        "id",
        "isFavorite",
        "isPinned",
        "language",
        "lastUsedAt",
        "tags",
        "title",
        "type",
        "updatedAt",
        "url",
      ].sort()
    )
    expect(item.tags).toEqual([{ tag: { name: "react" } }])
    expect(JSON.stringify(item)).not.toContain("user_1")
  })

  it("serializes dates to ISO strings and keeps a null lastUsedAt", async () => {
    findMany.mockResolvedValue([cardRow({ lastUsedAt: null })])

    const [item] = await getItemsByType("user_1", "type_1")

    expect(item.lastUsedAt).toBeNull()
    expect(item.createdAt).toBe("2026-05-01T09:00:00.000Z")
    expect(item.updatedAt).toBe("2026-05-02T09:00:00.000Z")
  })
})

describe("getProfileStats", () => {
  const TYPE_ROWS = [
    { id: "t_snip", name: "Snippet", slug: "snippets", icon: "Code", color: "#3b82f6", category: "TEXT", order: 0 },
    { id: "t_file", name: "File", slug: "files", icon: "File", color: "#6b7280", category: "FILE", order: 4 },
  ]

  beforeEach(() => {
    itemTypeFindMany.mockReset().mockResolvedValue(TYPE_ROWS)
    groupBy.mockReset().mockResolvedValue([{ typeId: "t_snip", _count: 4 }])
    itemCount.mockReset().mockResolvedValue(4)
    collectionCount.mockReset().mockResolvedValue(2)
  })

  it("scopes both totals to the user", async () => {
    await getProfileStats("user_profile_1")

    expect(itemCount).toHaveBeenCalledWith({ where: { userId: "user_profile_1" } })
    expect(collectionCount).toHaveBeenCalledWith({ where: { userId: "user_profile_1" } })
  })

  it("builds the breakdown from the system types with per-user counts", async () => {
    const stats = await getProfileStats("user_profile_2")

    expect(groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user_profile_2" } }),
    )
    expect(stats).toEqual({
      totalItems: 4,
      totalCollections: 2,
      typeBreakdown: [
        { id: "t_snip", name: "Snippet", slug: "snippets", icon: "Code", color: "#3b82f6", count: 4 },
        { id: "t_file", name: "File", slug: "files", icon: "File", color: "#6b7280", count: 0 },
      ],
    })
  })
})
