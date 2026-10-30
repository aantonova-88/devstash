import { describe, it, expect, vi, beforeEach } from "vitest"

const auth = vi.fn()
const createCollectionQuery = vi.fn()
const updateCollectionQuery = vi.fn()
const deleteCollectionQuery = vi.fn()
const revalidatePath = vi.fn()

vi.mock("@/auth", () => ({ auth }))
vi.mock("@/lib/db/collections", () => ({
  createCollection: createCollectionQuery,
  updateCollection: updateCollectionQuery,
  deleteCollection: deleteCollectionQuery,
}))
vi.mock("next/cache", () => ({ revalidatePath }))

const { createCollection, updateCollection, deleteCollection } = await import(
  "@/actions/collections"
)

const CREATED = { id: "col_1", name: "Docs", description: "Reference links" }
const UPDATED = { id: "col_1", name: "Docs", description: null, isFavorite: false }
const DELETED = { id: "col_1", name: "Docs" }

beforeEach(() => {
  auth.mockReset()
  createCollectionQuery.mockReset()
  updateCollectionQuery.mockReset()
  deleteCollectionQuery.mockReset()
  revalidatePath.mockReset()
  auth.mockResolvedValue({ user: { id: "user_1" } })
  createCollectionQuery.mockResolvedValue(CREATED)
  updateCollectionQuery.mockResolvedValue(UPDATED)
  deleteCollectionQuery.mockResolvedValue(DELETED)
})

describe("createCollection", () => {
  it("returns the created collection on success", async () => {
    const result = await createCollection({ name: "Docs", description: "Reference links" })

    expect(result).toEqual({ success: true, data: CREATED })
  })

  it("passes the session user id and the parsed (not raw) input to the query", async () => {
    await createCollection({
      name: "  Docs  ",
      description: "   ",
      userId: "attacker",
    } as never)

    expect(createCollectionQuery).toHaveBeenCalledWith("user_1", {
      name: "Docs",
      description: null,
    })
  })

  it("revalidates the whole layout tree so every sidebar picks it up", async () => {
    await createCollection({ name: "Docs" })

    expect(revalidatePath).toHaveBeenCalledWith("/", "layout")
  })

  it.each([null, {}, { user: {} }])(
    "rejects an unauthenticated session (%j) without touching the DB",
    async (session) => {
      auth.mockResolvedValue(session)

      const result = await createCollection({ name: "Docs" })

      expect(result).toEqual({ success: false, error: "Not authenticated" })
      expect(createCollectionQuery).not.toHaveBeenCalled()
      expect(revalidatePath).not.toHaveBeenCalled()
    }
  )

  it("returns the validation message and skips the DB for an invalid name", async () => {
    const result = await createCollection({ name: "   " })

    expect(result).toEqual({ success: false, error: "Name is required" })
    expect(createCollectionQuery).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("logs a DB error and returns a generic message without revalidating", async () => {
    const error = new Error("connection lost")
    createCollectionQuery.mockRejectedValue(error)
    const log = vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await createCollection({ name: "Docs" })

    expect(result).toEqual({ success: false, error: "Could not create this collection." })
    expect(log).toHaveBeenCalledWith("createCollection failed", error)
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe("updateCollection", () => {
  it("returns the updated collection on success", async () => {
    const result = await updateCollection("col_1", { name: "Docs" })

    expect(result).toEqual({ success: true, data: UPDATED })
  })

  it("passes the session user id and the parsed (not raw) input to the query", async () => {
    await updateCollection("col_1", {
      name: "  Docs  ",
      description: "   ",
      userId: "attacker",
    } as never)

    expect(updateCollectionQuery).toHaveBeenCalledWith("user_1", "col_1", {
      name: "Docs",
      description: null,
    })
  })

  it("revalidates the whole layout tree", async () => {
    await updateCollection("col_1", { name: "Docs" })

    expect(revalidatePath).toHaveBeenCalledWith("/", "layout")
  })

  it.each([null, {}, { user: {} }])(
    "rejects an unauthenticated session (%j) without touching the DB",
    async (session) => {
      auth.mockResolvedValue(session)

      const result = await updateCollection("col_1", { name: "Docs" })

      expect(result).toEqual({ success: false, error: "Not authenticated" })
      expect(updateCollectionQuery).not.toHaveBeenCalled()
    }
  )

  it("returns the validation message and skips the DB for an invalid name", async () => {
    const result = await updateCollection("col_1", { name: "" })

    expect(result).toEqual({ success: false, error: "Name is required" })
    expect(updateCollectionQuery).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("returns not-found for a foreign or unknown id without revalidating", async () => {
    updateCollectionQuery.mockResolvedValue(null)

    const result = await updateCollection("col_x", { name: "Docs" })

    expect(result).toEqual({ success: false, error: "Collection not found." })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("logs a DB error and returns a generic message without revalidating", async () => {
    const error = new Error("connection lost")
    updateCollectionQuery.mockRejectedValue(error)
    const log = vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await updateCollection("col_1", { name: "Docs" })

    expect(result).toEqual({ success: false, error: "Could not update this collection." })
    expect(log).toHaveBeenCalledWith("updateCollection failed", error)
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe("deleteCollection", () => {
  it("returns the deleted collection and revalidates the layout tree", async () => {
    const result = await deleteCollection("col_1")

    expect(result).toEqual({ success: true, data: DELETED })
    expect(deleteCollectionQuery).toHaveBeenCalledWith("user_1", "col_1")
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout")
  })

  it.each([null, {}, { user: {} }])(
    "rejects an unauthenticated session (%j) without touching the DB",
    async (session) => {
      auth.mockResolvedValue(session)

      const result = await deleteCollection("col_1")

      expect(result).toEqual({ success: false, error: "Not authenticated" })
      expect(deleteCollectionQuery).not.toHaveBeenCalled()
    }
  )

  it("returns not-found for a foreign or unknown id without revalidating", async () => {
    deleteCollectionQuery.mockResolvedValue(null)

    const result = await deleteCollection("col_x")

    expect(result).toEqual({ success: false, error: "Collection not found." })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("logs a DB error and returns a generic message without revalidating", async () => {
    const error = new Error("connection lost")
    deleteCollectionQuery.mockRejectedValue(error)
    const log = vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await deleteCollection("col_1")

    expect(result).toEqual({ success: false, error: "Could not delete this collection." })
    expect(log).toHaveBeenCalledWith("deleteCollection failed", error)
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
