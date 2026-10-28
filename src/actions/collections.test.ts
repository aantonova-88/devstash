import { describe, it, expect, vi, beforeEach } from "vitest"

const auth = vi.fn()
const createCollectionQuery = vi.fn()
const revalidatePath = vi.fn()

vi.mock("@/auth", () => ({ auth }))
vi.mock("@/lib/db/collections", () => ({ createCollection: createCollectionQuery }))
vi.mock("next/cache", () => ({ revalidatePath }))

const { createCollection } = await import("@/actions/collections")

const CREATED = { id: "col_1", name: "Docs", description: "Reference links" }

beforeEach(() => {
  auth.mockReset()
  createCollectionQuery.mockReset()
  revalidatePath.mockReset()
  auth.mockResolvedValue({ user: { id: "user_1" } })
  createCollectionQuery.mockResolvedValue(CREATED)
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
