import { describe, it, expect, vi, beforeEach } from "vitest"

const auth = vi.fn()
const updateItemQuery = vi.fn()
const deleteItemQuery = vi.fn()
const createItemQuery = vi.fn()
const getSystemItemTypeById = vi.fn()
const revalidatePath = vi.fn()

vi.mock("@/auth", () => ({ auth }))
vi.mock("@/lib/db/items", () => ({
  updateItem: updateItemQuery,
  deleteItem: deleteItemQuery,
  createItem: createItemQuery,
  getSystemItemTypeById,
}))
vi.mock("next/cache", () => ({ revalidatePath }))

const { updateItem, deleteItem, createItem } = await import("@/actions/items")

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

describe("deleteItem", () => {
  const DELETED = { id: "item_1", title: "useDebounce hook", typeSlug: "snippets" }

  beforeEach(() => {
    deleteItemQuery.mockReset()
    deleteItemQuery.mockResolvedValue(DELETED)
  })

  it("returns the deleted item on success", async () => {
    const result = await deleteItem("item_1")

    expect(result).toEqual({ success: true, data: DELETED })
  })

  it("passes the session user id to the query rather than trusting the client", async () => {
    await deleteItem("item_1")

    expect(deleteItemQuery).toHaveBeenCalledWith("user_1", "item_1")
  })

  it("revalidates the dashboard and the deleted item's type page", async () => {
    await deleteItem("item_1")

    expect(revalidatePath).toHaveBeenCalledWith("/dashboard")
    expect(revalidatePath).toHaveBeenCalledWith("/items/snippets")
  })

  it("revalidates the slug the query reports, not one derived elsewhere", async () => {
    deleteItemQuery.mockResolvedValue({ ...DELETED, typeSlug: "links" })

    await deleteItem("item_1")

    expect(revalidatePath).toHaveBeenCalledWith("/items/links")
  })

  describe("authentication", () => {
    it.each([
      ["no session", null],
      ["a session without a user", {}],
      ["a session user without an id", { user: {} }],
    ])("rejects %s without touching the database", async (_label, session) => {
      auth.mockResolvedValue(session)

      const result = await deleteItem("item_1")

      expect(result).toEqual({ success: false, error: "Not authenticated" })
      expect(deleteItemQuery).not.toHaveBeenCalled()
      expect(revalidatePath).not.toHaveBeenCalled()
    })
  })

  describe("ownership", () => {
    it("reports a missing item when the query finds no matching row", async () => {
      deleteItemQuery.mockResolvedValue(null)

      const result = await deleteItem("item_1")

      expect(result).toEqual({ success: false, error: "Item not found" })
    })

    it("does not revalidate when the item was not found", async () => {
      deleteItemQuery.mockResolvedValue(null)

      await deleteItem("item_1")

      expect(revalidatePath).not.toHaveBeenCalled()
    })
  })

  describe("failures", () => {
    it("returns a generic message instead of leaking the database error", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {})
      deleteItemQuery.mockRejectedValue(new Error("connection string leaked"))

      const result = await deleteItem("item_1")

      expect(result).toEqual({ success: false, error: "Could not delete this item." })
    })

    it("logs the underlying error for the server operator", async () => {
      const logged = vi.spyOn(console, "error").mockImplementation(() => {})
      const err = new Error("connection lost")
      deleteItemQuery.mockRejectedValue(err)

      await deleteItem("item_1")

      expect(logged).toHaveBeenCalledWith("deleteItem failed", err)
    })

    it("does not revalidate when the delete throws", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {})
      deleteItemQuery.mockRejectedValue(new Error("connection lost"))

      await deleteItem("item_1")

      expect(revalidatePath).not.toHaveBeenCalled()
    })
  })
})

const SNIPPET_TYPE = {
  id: "type_1",
  name: "Snippet",
  slug: "snippets",
  icon: "Code",
  color: "#3b82f6",
  category: "TEXT",
}

const LINK_TYPE = {
  id: "type_5",
  name: "Link",
  slug: "links",
  icon: "Link",
  color: "#10b981",
  category: "URL",
}

const FILE_TYPE = {
  id: "type_6",
  name: "File",
  slug: "files",
  icon: "File",
  color: "#6b7280",
  category: "FILE",
}

const CREATE_INPUT = {
  typeId: "type_1",
  title: "useDebounce hook",
  description: "A reusable React hook",
  content: "export function useDebounce() {}",
  language: "typescript",
  url: null,
  tags: ["react"],
}

const CREATED = { id: "item_9", title: "useDebounce hook", type: SNIPPET_TYPE }

describe("createItem", () => {
  beforeEach(() => {
    createItemQuery.mockReset()
    getSystemItemTypeById.mockReset()
    auth.mockResolvedValue({ user: { id: "user_1" } })
    getSystemItemTypeById.mockResolvedValue(SNIPPET_TYPE)
    createItemQuery.mockResolvedValue(CREATED)
  })

  it("returns the created item on success", async () => {
    const result = await createItem(CREATE_INPUT)

    expect(result).toEqual({ success: true, data: CREATED })
  })

  it("creates the item for the session user, not anyone named in the input", async () => {
    await createItem({ ...CREATE_INPUT, userId: "user_2" } as never)

    expect(createItemQuery.mock.calls[0][0]).toBe("user_1")
  })

  it("resolves the type id against the database before using it", async () => {
    await createItem(CREATE_INPUT)

    expect(getSystemItemTypeById).toHaveBeenCalledWith("type_1")
  })

  it("resolves the parsed type id, not the raw one", async () => {
    await createItem({ ...CREATE_INPUT, typeId: "  type_1  " })

    expect(getSystemItemTypeById).toHaveBeenCalledWith("type_1")
  })

  it("rejects a type id that is not a system type, without writing", async () => {
    getSystemItemTypeById.mockResolvedValue(null)

    const result = await createItem({ ...CREATE_INPUT, typeId: "type_someone_elses" })

    expect(result).toEqual({ success: false, error: "Unknown item type" })
    expect(createItemQuery).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("stores the type id the database returned, not the one the client sent", async () => {
    await createItem(CREATE_INPUT)

    expect(createItemQuery.mock.calls[0][1].typeId).toBe(SNIPPET_TYPE.id)
  })

  it("drops content fields the resolved type cannot hold", async () => {
    getSystemItemTypeById.mockResolvedValue(LINK_TYPE)

    // A crafted request sends both content and a url for a Link type.
    await createItem({
      ...CREATE_INPUT,
      typeId: LINK_TYPE.id,
      content: "not allowed here",
      url: "https://example.com",
    })

    expect(createItemQuery.mock.calls[0][1]).toMatchObject({
      content: null,
      url: "https://example.com",
      language: null,
    })
  })

  it("rejects a URL type with no url", async () => {
    getSystemItemTypeById.mockResolvedValue(LINK_TYPE)

    const result = await createItem({ ...CREATE_INPUT, typeId: LINK_TYPE.id, url: null })

    expect(result).toEqual({
      success: false,
      error: "A URL is required for this item type.",
    })
    expect(createItemQuery).not.toHaveBeenCalled()
  })

  it("rejects FILE types even though the dialog never offers them", async () => {
    getSystemItemTypeById.mockResolvedValue(FILE_TYPE)

    const result = await createItem({ ...CREATE_INPUT, typeId: FILE_TYPE.id })

    expect(result).toEqual({
      success: false,
      error: "File and image items are not supported yet.",
    })
    expect(createItemQuery).not.toHaveBeenCalled()
  })

  it("hands the query the parsed data, not the raw input", async () => {
    await createItem({ ...CREATE_INPUT, title: "  Padded  ", description: "" })

    expect(createItemQuery.mock.calls[0][1]).toMatchObject({
      title: "Padded",
      description: null,
    })
  })

  it("revalidates the dashboard and the resolved type's listing", async () => {
    await createItem(CREATE_INPUT)

    expect(revalidatePath).toHaveBeenCalledWith("/dashboard")
    expect(revalidatePath).toHaveBeenCalledWith("/items/snippets")
  })

  it("revalidates the slug the database returned rather than one derived locally", async () => {
    getSystemItemTypeById.mockResolvedValue({ ...SNIPPET_TYPE, slug: "renamed-slug" })

    await createItem(CREATE_INPUT)

    expect(revalidatePath).toHaveBeenCalledWith("/items/renamed-slug")
  })

  it.each([
    ["no session", null],
    ["a session with no user", {}],
    ["a user with no id", { user: {} }],
  ])("rejects %s without touching the database", async (_label, session) => {
    auth.mockResolvedValue(session)

    const result = await createItem(CREATE_INPUT)

    expect(result).toEqual({ success: false, error: "Not authenticated" })
    expect(getSystemItemTypeById).not.toHaveBeenCalled()
    expect(createItemQuery).not.toHaveBeenCalled()
  })

  it("rejects invalid input before resolving the type", async () => {
    const result = await createItem({ ...CREATE_INPUT, title: "   " })

    expect(result).toEqual({ success: false, error: "Title is required" })
    expect(getSystemItemTypeById).not.toHaveBeenCalled()
  })

  it("logs the real failure but returns a generic message", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    createItemQuery.mockRejectedValue(new Error("connection reset"))

    const result = await createItem(CREATE_INPUT)

    expect(result).toEqual({ success: false, error: "Could not create this item." })
    expect(consoleError).toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
