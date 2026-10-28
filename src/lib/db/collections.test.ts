import { describe, it, expect, vi, beforeEach } from "vitest"

const findMany = vi.fn()
const create = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: { collection: { findMany, create } },
}))

const { getRecentCollections, createCollection } = await import("@/lib/db/collections")

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
