import { describe, it, expect, vi, beforeEach } from "vitest"

const auth = vi.fn()
const updateItemQuery = vi.fn()
const revalidatePath = vi.fn()

vi.mock("@/auth", () => ({ auth }))
vi.mock("@/lib/db/items", () => ({ updateItem: updateItemQuery }))
vi.mock("next/cache", () => ({ revalidatePath }))

const { updateItem } = await import("@/actions/items")

const INPUT = {
  title: "Renamed hook",
  description: "Updated description",
  content: "export function useDebounce() {}",
  language: "typescript",
  url: null,
  tags: ["react", "hooks"],
}

const ITEM = {
  id: "item_1",
  title: "Renamed hook",
  type: { id: "type_1", name: "Snippet", slug: "snippets" },
}

beforeEach(() => {
  auth.mockReset()
  updateItemQuery.mockReset()
  revalidatePath.mockReset()
  auth.mockResolvedValue({ user: { id: "user_1" } })
  updateItemQuery.mockResolvedValue(ITEM)
})

describe("updateItem", () => {
  it("returns the updated item on success", async () => {
    const result = await updateItem("item_1", INPUT)

    expect(result).toEqual({ success: true, data: ITEM })
  })

  it("passes the session user id to the query rather than trusting the client", async () => {
    await updateItem("item_1", INPUT)

    expect(updateItemQuery).toHaveBeenCalledWith(
      "user_1",
      "item_1",
      expect.objectContaining({ title: "Renamed hook" })
    )
  })

  it("hands the query the parsed data, not the raw input", async () => {
    await updateItem("item_1", { ...INPUT, title: "  Padded  ", description: "" })

    const fields = updateItemQuery.mock.calls[0][2]
    expect(fields.title).toBe("Padded")
    expect(fields.description).toBeNull()
  })

  it("revalidates the dashboard and the item's type page", async () => {
    await updateItem("item_1", INPUT)

    expect(revalidatePath).toHaveBeenCalledWith("/dashboard")
    expect(revalidatePath).toHaveBeenCalledWith("/items/snippets")
  })

  describe("authentication", () => {
    it.each([
      ["no session", null],
      ["a session without a user", {}],
      ["a session user without an id", { user: {} }],
    ])("rejects %s without touching the database", async (_label, session) => {
      auth.mockResolvedValue(session)

      const result = await updateItem("item_1", INPUT)

      expect(result).toEqual({ success: false, error: "Not authenticated" })
      expect(updateItemQuery).not.toHaveBeenCalled()
    })
  })

  describe("validation", () => {
    it("rejects an empty title and never reaches the database", async () => {
      const result = await updateItem("item_1", { ...INPUT, title: "   " })

      expect(result).toEqual({ success: false, error: "Title is required" })
      expect(updateItemQuery).not.toHaveBeenCalled()
    })

    it("rejects an invalid url", async () => {
      const result = await updateItem("item_1", { ...INPUT, url: "example.com" })

      expect(result).toEqual({
        success: false,
        error: "Enter a valid URL starting with http:// or https://",
      })
      expect(updateItemQuery).not.toHaveBeenCalled()
    })

    it("does not revalidate when validation fails", async () => {
      await updateItem("item_1", { ...INPUT, title: "" })

      expect(revalidatePath).not.toHaveBeenCalled()
    })
  })

  describe("ownership", () => {
    it("reports a missing item when the query finds no matching row", async () => {
      updateItemQuery.mockResolvedValue(null)

      const result = await updateItem("item_1", INPUT)

      expect(result).toEqual({ success: false, error: "Item not found" })
    })

    it("does not revalidate when the item was not found", async () => {
      updateItemQuery.mockResolvedValue(null)

      await updateItem("item_1", INPUT)

      expect(revalidatePath).not.toHaveBeenCalled()
    })
  })

  describe("failures", () => {
    it("returns a generic message instead of leaking the database error", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {})
      updateItemQuery.mockRejectedValue(new Error("connection string leaked"))

      const result = await updateItem("item_1", INPUT)

      expect(result).toEqual({ success: false, error: "Could not save this item." })
    })

    it("logs the underlying error for the server operator", async () => {
      const logged = vi.spyOn(console, "error").mockImplementation(() => {})
      const err = new Error("connection lost")
      updateItemQuery.mockRejectedValue(err)

      await updateItem("item_1", INPUT)

      expect(logged).toHaveBeenCalledWith("updateItem failed", err)
    })
  })
})
