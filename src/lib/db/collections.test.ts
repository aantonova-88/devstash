import { describe, it, expect, vi, beforeEach } from "vitest"

const findMany = vi.fn()
const create = vi.fn()
const count = vi.fn()
const findFirst = vi.fn()
const update = vi.fn()
const del = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: { collection: { findMany, create, count, findFirst, update, delete: del } },
}))

const {
  getRecentCollections,
  getCollectionsPage,
  getCollectionStats,
  createCollection,
  ownsCollections,
  getCollectionById,
  updateCollection,
  deleteCollection,
} = await import(
  "@/lib/db/collections"
)

const SNIPPET = { icon: "Code", color: "#3b82f6", name: "snippet" }
const NOTE = { icon: "StickyNote", color: "#fde047", name: "note" }

function collection(id: string, types: Array<typeof SNIPPET>) {
  return {
    id,
    name: `Collection ${id}`,
    description: null,
    isFavorite: false,
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    items: types.map((type) => ({ item: { type } })),
  }
}

beforeEach(() => {
  findMany.mockReset()
  create.mockReset()
  count.mockReset()
  findFirst.mockReset()
  update.mockReset()
  del.mockReset()
})

describe("getRecentCollections", () => {
  it("scopes to the user and selects only the item type, never full item rows", async () => {
    findMany.mockResolvedValue([])
    await getRecentCollections("user-1")

    const args = findMany.mock.calls[0][0]
    expect(args.where).toEqual({ userId: "user-1" })
    expect(args.include.items).toEqual({
      select: {
        item: {
          select: { type: { select: { icon: true, color: true, name: true } } },
        },
      },
    })
  })

  it("counts items and picks the most common type as dominant", async () => {
    findMany.mockResolvedValue([collection("c1", [NOTE, SNIPPET, SNIPPET])])
    const [result] = await getRecentCollections("user-2")

    expect(result.itemCount).toBe(3)
    expect(result.dominantColor).toBe(SNIPPET.color)
    expect(result.dominantIcon).toBe(SNIPPET.icon)
    expect(result.typeIcons).toEqual([SNIPPET, NOTE])
  })

  it("falls back to a neutral folder for an empty collection", async () => {
    findMany.mockResolvedValue([collection("c2", [])])
    const [result] = await getRecentCollections("user-3")

    expect(result.itemCount).toBe(0)
    expect(result.dominantColor).toBe("#6b7280")
    expect(result.dominantIcon).toBe("FolderOpen")
    expect(result.typeIcons).toEqual([])
  })
})

describe("getCollectionsPage", () => {
  it("fetches only the requested window, scoped to the user, in a total order", async () => {
    findMany.mockResolvedValue([])
    await getCollectionsPage("user-1", { skip: 21, take: 21 })

    const args = findMany.mock.calls[0][0]
    expect(args.where).toEqual({ userId: "user-1" })
    expect(args.skip).toBe(21)
    expect(args.take).toBe(21)
    expect(args.orderBy).toEqual([{ updatedAt: "desc" }, { id: "asc" }])
  })

  it("serializes cards like getRecentCollections", async () => {
    findMany.mockResolvedValue([collection("c1", [NOTE, SNIPPET, SNIPPET])])
    const [result] = await getCollectionsPage("user-2", { skip: 0, take: 6 })

    expect(result.itemCount).toBe(3)
    expect(result.dominantColor).toBe(SNIPPET.color)
    expect(result.typeIcons).toEqual([SNIPPET, NOTE])
  })
})

describe("getCollectionStats", () => {
  it("counts all and favorite collections for the user", async () => {
    count.mockResolvedValueOnce(8).mockResolvedValueOnce(3)

    expect(await getCollectionStats("user-1")).toEqual({
      totalCollections: 8,
      favoriteCollectionsCount: 3,
    })
    expect(count).toHaveBeenCalledWith({ where: { userId: "user-1" } })
    expect(count).toHaveBeenCalledWith({ where: { userId: "user-1", isFavorite: true } })
  })
})

describe("createCollection", () => {
  const CREATED = { id: "col_1", name: "Docs", description: "Reference links" }

  it("attaches the collection to the given user", async () => {
    create.mockResolvedValue(CREATED)
    await createCollection("user-1", { name: "Docs", description: "Reference links" })

    expect(create.mock.calls[0][0].data).toEqual({
      userId: "user-1",
      name: "Docs",
      description: "Reference links",
    })
  })

  it("selects only the summary fields and returns them", async () => {
    create.mockResolvedValue(CREATED)
    const result = await createCollection("user-1", { name: "Docs", description: null })

    expect(create.mock.calls[0][0].select).toEqual({ id: true, name: true, description: true })
    expect(result).toEqual(CREATED)
  })

  it("stores a null description as null", async () => {
    create.mockResolvedValue({ ...CREATED, description: null })
    await createCollection("user-1", { name: "Docs", description: null })

    expect(create.mock.calls[0][0].data.description).toBeNull()
  })

  it("propagates database errors", async () => {
    create.mockRejectedValue(new Error("connection lost"))

    await expect(
      createCollection("user-1", { name: "Docs", description: null })
    ).rejects.toThrow("connection lost")
  })
})

describe("ownsCollections", () => {
  it("counts only the user's own collections among the ids", async () => {
    count.mockResolvedValue(2)

    await ownsCollections("user_1", ["col_1", "col_2"])

    expect(count).toHaveBeenCalledWith({
      where: { id: { in: ["col_1", "col_2"] }, userId: "user_1" },
    })
  })

  it("is true when every id is owned", async () => {
    count.mockResolvedValue(2)

    await expect(ownsCollections("user_1", ["col_1", "col_2"])).resolves.toBe(true)
  })

  it("is false when any id is foreign or unknown", async () => {
    count.mockResolvedValue(1)

    await expect(ownsCollections("user_1", ["col_1", "col_other"])).resolves.toBe(false)
  })

  it("is true for an empty list without querying", async () => {
    await expect(ownsCollections("user_1", [])).resolves.toBe(true)
    expect(count).not.toHaveBeenCalled()
  })
})

describe("getCollectionById", () => {
  it("scopes the lookup to the user and selects only summary fields", async () => {
    findFirst.mockResolvedValue(null)
    await getCollectionById("user-1", "col-1")

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: "col-1", userId: "user-1" },
      select: { id: true, name: true, description: true, isFavorite: true },
    })
  })

  it("returns the collection when owned", async () => {
    const row = { id: "col-1", name: "React", description: null, isFavorite: true }
    findFirst.mockResolvedValue(row)

    expect(await getCollectionById("user-1", "col-1")).toEqual(row)
  })

  it("returns null for an unknown or foreign id", async () => {
    findFirst.mockResolvedValue(null)

    expect(await getCollectionById("user-1", "someone-elses")).toBeNull()
  })
})

function prismaError(code: string) {
  return Object.assign(new Error(code), { code })
}

describe("updateCollection", () => {
  const SUMMARY = { id: "col-1", name: "Docs", description: null, isFavorite: false }

  it("scopes the update to the user and writes only name and description", async () => {
    update.mockResolvedValue(SUMMARY)

    const result = await updateCollection("user-1", "col-1", { name: "Docs", description: null })

    expect(result).toEqual(SUMMARY)
    expect(update).toHaveBeenCalledWith({
      where: { id: "col-1", userId: "user-1" },
      data: { name: "Docs", description: null },
      select: { id: true, name: true, description: true, isFavorite: true },
    })
  })

  it("returns null for a foreign or unknown id (P2025)", async () => {
    update.mockRejectedValue(prismaError("P2025"))

    expect(await updateCollection("user-1", "col-x", { name: "Docs", description: null })).toBeNull()
  })

  it("rethrows other Prisma errors", async () => {
    update.mockRejectedValue(prismaError("P1001"))

    await expect(
      updateCollection("user-1", "col-1", { name: "Docs", description: null })
    ).rejects.toThrow("P1001")
  })
})

describe("deleteCollection", () => {
  it("deletes only the collection row, scoped to the user", async () => {
    del.mockResolvedValue({ id: "col-1", name: "Docs" })

    const result = await deleteCollection("user-1", "col-1")

    expect(result).toEqual({ id: "col-1", name: "Docs" })
    expect(del).toHaveBeenCalledWith({
      where: { id: "col-1", userId: "user-1" },
      select: { id: true, name: true },
    })
  })

  it("returns null for a foreign or unknown id (P2025)", async () => {
    del.mockRejectedValue(prismaError("P2025"))

    expect(await deleteCollection("user-1", "col-x")).toBeNull()
  })

  it("rethrows other Prisma errors", async () => {
    del.mockRejectedValue(prismaError("P1001"))

    await expect(deleteCollection("user-1", "col-1")).rejects.toThrow("P1001")
  })
})
