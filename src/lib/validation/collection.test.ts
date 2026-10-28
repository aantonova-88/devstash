import { describe, it, expect } from "vitest"
import {
  COLLECTION_DESCRIPTION_MAX_LENGTH,
  COLLECTION_NAME_MAX_LENGTH,
  createCollectionSchema,
} from "@/lib/validation/collection"

describe("createCollectionSchema", () => {
  it("trims the name and description", () => {
    const result = createCollectionSchema.parse({
      name: "  React Patterns  ",
      description: "  Hooks and more  ",
    })

    expect(result).toEqual({ name: "React Patterns", description: "Hooks and more" })
  })

  it("rejects a missing, empty or whitespace-only name", () => {
    for (const name of [undefined, "", "   "]) {
      const result = createCollectionSchema.safeParse({ name })
      expect(result.success).toBe(false)
    }
    expect(createCollectionSchema.safeParse({ name: " " }).error?.issues[0].message).toBe(
      "Name is required"
    )
  })

  it("accepts a name at the length limit and rejects one over it", () => {
    const atLimit = "a".repeat(COLLECTION_NAME_MAX_LENGTH)
    expect(createCollectionSchema.safeParse({ name: atLimit }).success).toBe(true)

    const over = createCollectionSchema.safeParse({ name: `${atLimit}a` })
    expect(over.success).toBe(false)
    expect(over.error?.issues[0].message).toBe("Name is too long")
  })

  it("normalises an empty, whitespace-only, null or missing description to null", () => {
    for (const description of ["", "   ", null, undefined]) {
      const result = createCollectionSchema.parse({ name: "Docs", description })
      expect(result.description).toBeNull()
    }
  })

  it("accepts a description at the length limit and rejects one over it", () => {
    const atLimit = "d".repeat(COLLECTION_DESCRIPTION_MAX_LENGTH)
    expect(
      createCollectionSchema.safeParse({ name: "Docs", description: atLimit }).success
    ).toBe(true)

    const over = createCollectionSchema.safeParse({ name: "Docs", description: `${atLimit}d` })
    expect(over.success).toBe(false)
    expect(over.error?.issues[0].message).toBe("Description is too long")
  })

  it("strips unknown keys such as a client-supplied userId", () => {
    const result = createCollectionSchema.parse({ name: "Docs", userId: "someone-else" })

    expect(result).not.toHaveProperty("userId")
  })
})
