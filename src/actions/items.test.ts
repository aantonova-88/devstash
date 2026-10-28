import { describe, it, expect, vi, beforeEach } from "vitest"

const auth = vi.fn()
const updateItemQuery = vi.fn()
const deleteItemQuery = vi.fn()
const createItemQuery = vi.fn()
const getSystemItemTypeById = vi.fn()
const revalidatePath = vi.fn()
const deleteObject = vi.fn()
const headObject = vi.fn()
const ownsCollections = vi.fn()

vi.mock("@/auth", () => ({ auth }))
vi.mock("@/lib/db/items", () => ({
  updateItem: updateItemQuery,
  deleteItem: deleteItemQuery,
  createItem: createItemQuery,
  getSystemItemTypeById,
}))
vi.mock("next/cache", () => ({ revalidatePath }))
vi.mock("@/lib/r2", () => ({ deleteObject, headObject }))
vi.mock("@/lib/db/collections", () => ({ ownsCollections }))

const { updateItem, deleteItem, createItem } = await import("@/actions/items")

const INPUT = {
  title: "Renamed hook",
  description: "Updated description",
  content: "export function useDebounce() {}",
  language: "typescript",
  url: null,
  tags: ["react", "hooks"],
  collectionIds: ["col_1", "col_2"],
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
  ownsCollections.mockReset()
  auth.mockResolvedValue({ user: { id: "user_1" } })
  updateItemQuery.mockResolvedValue(ITEM)
  ownsCollections.mockResolvedValue(true)
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

  it("revalidates every shell layout, since sidebar collection counts may change", async () => {
    await updateItem("item_1", INPUT)

    expect(revalidatePath).toHaveBeenCalledWith("/", "layout")
  })

  describe("collections", () => {
    it("checks the deduplicated ids against the session user", async () => {
      await updateItem("item_1", { ...INPUT, collectionIds: ["col_1", " col_1 ", "col_2"] })

      expect(ownsCollections).toHaveBeenCalledWith("user_1", ["col_1", "col_2"])
      expect(updateItemQuery.mock.calls[0][2].collectionIds).toEqual(["col_1", "col_2"])
    })

    it("defaults to no collections when none are sent", async () => {
      await updateItem("item_1", { ...INPUT, collectionIds: undefined })

      expect(updateItemQuery.mock.calls[0][2].collectionIds).toEqual([])
    })

    it("rejects collections the user does not own, without writing", async () => {
      ownsCollections.mockResolvedValue(false)

      const result = await updateItem("item_1", INPUT)

      expect(result).toEqual({
        success: false,
        error: "One or more collections could not be found.",
      })
      expect(updateItemQuery).not.toHaveBeenCalled()
      expect(revalidatePath).not.toHaveBeenCalled()
    })
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
  const DELETED = {
    id: "item_1",
    title: "useDebounce hook",
    typeSlug: "snippets",
    fileKey: null,
  }
  const FILE_KEY = "user_1/files/0b9f0a52-3c1e-4c55-9d7e-2f1f3a6b8c90.pdf"

  beforeEach(() => {
    deleteItemQuery.mockReset()
    deleteObject.mockReset()
    deleteItemQuery.mockResolvedValue(DELETED)
    deleteObject.mockResolvedValue(undefined)
  })

  describe("stored files", () => {
    it("removes the item's object from R2 using the key the query returned", async () => {
      deleteItemQuery.mockResolvedValue({ ...DELETED, typeSlug: "files", fileKey: FILE_KEY })

      await deleteItem("item_1")

      expect(deleteObject).toHaveBeenCalledWith(FILE_KEY)
    })

    it("does not touch R2 for an item with no file", async () => {
      await deleteItem("item_1")

      expect(deleteObject).not.toHaveBeenCalled()
    })

    it("does not touch R2 when the item was not found", async () => {
      deleteItemQuery.mockResolvedValue(null)

      await deleteItem("item_1")

      expect(deleteObject).not.toHaveBeenCalled()
    })

    it("still reports success when R2 fails, since the row is already gone", async () => {
      const logged = vi.spyOn(console, "error").mockImplementation(() => {})
      const deleted = { ...DELETED, typeSlug: "files", fileKey: FILE_KEY }
      deleteItemQuery.mockResolvedValue(deleted)
      deleteObject.mockRejectedValue(new Error("R2 unavailable"))

      const result = await deleteItem("item_1")

      expect(result).toEqual({ success: true, data: deleted })
      expect(revalidatePath).toHaveBeenCalledWith("/items/files")
      expect(logged).toHaveBeenCalledWith(
        "deleteItem: could not remove file from R2",
        FILE_KEY,
        expect.any(Error)
      )
    })
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
  collectionIds: ["col_1"],
}

const CREATED = { id: "item_9", title: "useDebounce hook", type: SNIPPET_TYPE }

describe("createItem", () => {
  beforeEach(() => {
    createItemQuery.mockReset()
    getSystemItemTypeById.mockReset()
    headObject.mockReset()
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

  it("stores no file fields for a non-FILE type, even if a key is sent", async () => {
    await createItem({ ...CREATE_INPUT, fileKey: "user_1/files/whatever.pdf" })

    expect(headObject).not.toHaveBeenCalled()
    expect(createItemQuery.mock.calls[0][1]).toMatchObject({
      fileUrl: null,
      fileName: null,
      fileSize: null,
    })
  })

  describe("FILE types", () => {
    const KEY = "user_1/files/0b9f0a52-3c1e-4c55-9d7e-2f1f3a6b8c90.pdf"
    const FILE_INPUT = {
      ...CREATE_INPUT,
      typeId: FILE_TYPE.id,
      content: null,
      language: null,
      fileKey: KEY,
    }

    beforeEach(() => {
      headObject.mockReset()
      getSystemItemTypeById.mockResolvedValue(FILE_TYPE)
      headObject.mockResolvedValue({ size: 2048, fileName: "spec.pdf" })
    })

    it("stores the key with the name and size read back from R2", async () => {
      await createItem(FILE_INPUT)

      expect(headObject).toHaveBeenCalledWith(KEY)
      expect(createItemQuery.mock.calls[0][1]).toMatchObject({
        fileUrl: KEY,
        fileName: "spec.pdf",
        fileSize: 2048,
        content: null,
        url: null,
        language: null,
      })
    })

    it("ignores a name or size the client tries to supply", async () => {
      await createItem({ ...FILE_INPUT, fileName: "evil.exe", fileSize: 1 } as never)

      expect(createItemQuery.mock.calls[0][1]).toMatchObject({
        fileName: "spec.pdf",
        fileSize: 2048,
      })
    })

    it("falls back to the key's basename when the object has no stored name", async () => {
      headObject.mockResolvedValue({ size: 2048, fileName: null })

      await createItem(FILE_INPUT)

      expect(createItemQuery.mock.calls[0][1].fileName).toBe(
        "0b9f0a52-3c1e-4c55-9d7e-2f1f3a6b8c90.pdf"
      )
    })

    it("requires an upload", async () => {
      const result = await createItem({ ...FILE_INPUT, fileKey: null })

      expect(result).toEqual({ success: false, error: "Upload a file for this item type." })
      expect(createItemQuery).not.toHaveBeenCalled()
    })

    it.each([
      ["another user's key", "user_2/files/0b9f0a52-3c1e-4c55-9d7e-2f1f3a6b8c90.pdf"],
      ["an image key on a File item", "user_1/images/0b9f0a52-3c1e-4c55-9d7e-2f1f3a6b8c90.png"],
      ["a path-traversal key", "user_1/files/../../user_2/files/x.pdf"],
    ])("rejects %s without asking R2 or writing", async (_label, fileKey) => {
      const result = await createItem({ ...FILE_INPUT, fileKey })

      expect(result).toEqual({
        success: false,
        error: "Invalid upload. Please upload the file again.",
      })
      expect(headObject).not.toHaveBeenCalled()
      expect(createItemQuery).not.toHaveBeenCalled()
    })

    it("rejects a key whose object is not in R2", async () => {
      headObject.mockResolvedValue(null)

      const result = await createItem(FILE_INPUT)

      expect(result).toEqual({
        success: false,
        error: "Upload not found. Please upload the file again.",
      })
      expect(createItemQuery).not.toHaveBeenCalled()
    })

    it("re-checks the size limit against what R2 actually stored", async () => {
      headObject.mockResolvedValue({ size: 10 * 1024 * 1024 + 1, fileName: "big.pdf" })

      const result = await createItem(FILE_INPUT)

      expect(result).toEqual({ success: false, error: "File is too large." })
      expect(createItemQuery).not.toHaveBeenCalled()
    })

    it("applies the Image type's own, smaller limit", async () => {
      getSystemItemTypeById.mockResolvedValue({ ...FILE_TYPE, id: "type_7", slug: "images" })
      headObject.mockResolvedValue({ size: 5 * 1024 * 1024 + 1, fileName: "big.png" })

      const result = await createItem({
        ...FILE_INPUT,
        typeId: "type_7",
        fileKey: "user_1/images/0b9f0a52-3c1e-4c55-9d7e-2f1f3a6b8c90.png",
      })

      expect(result).toEqual({ success: false, error: "File is too large." })
    })
  })

  it("hands the query the parsed data, not the raw input", async () => {
    await createItem({ ...CREATE_INPUT, title: "  Padded  ", description: "" })

    expect(createItemQuery.mock.calls[0][1]).toMatchObject({
      title: "Padded",
      description: null,
    })
  })

  it("revalidates every shell layout, since sidebar collection counts may change", async () => {
    await createItem(CREATE_INPUT)

    expect(revalidatePath).toHaveBeenCalledWith("/", "layout")
  })

  it("attaches the parsed collection ids after checking them against the session user", async () => {
    await createItem({ ...CREATE_INPUT, collectionIds: ["col_1", "col_1", "col_2"] })

    expect(ownsCollections).toHaveBeenCalledWith("user_1", ["col_1", "col_2"])
    expect(createItemQuery.mock.calls[0][1].collectionIds).toEqual(["col_1", "col_2"])
  })

  it("rejects collections the user does not own, without writing", async () => {
    ownsCollections.mockResolvedValue(false)

    const result = await createItem({ ...CREATE_INPUT, collectionIds: ["col_someone_elses"] })

    expect(result).toEqual({
      success: false,
      error: "One or more collections could not be found.",
    })
    expect(createItemQuery).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
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
