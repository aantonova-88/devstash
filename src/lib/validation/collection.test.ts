import { describe, it, expect } from "vitest"
import {
  COLLECTION_DESCRIPTION_MAX_LENGTH,
  COLLECTION_NAME_MAX_LENGTH,
  createCollectionSchema,
  updateCollectionSchema,
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

describe("updateCollectionSchema", () => {
  it("applies the same trim and empty → null rules as create", () => {
    expect(updateCollectionSchema.parse({ name: "  Docs  ", description: "   " })).toEqual({
      name: "Docs",
      description: null,
    })
  })

  it("rejects a blank or over-long name with the same messages as create", () => {
    for (const name of ["   ", "a".repeat(COLLECTION_NAME_MAX_LENGTH + 1)]) {
      const update = updateCollectionSchema.safeParse({ name })
      const create = createCollectionSchema.safeParse({ name })
      expect(update.success).toBe(false)
      expect(update.error?.issues[0].message).toBe(create.error?.issues[0].message)
    }
  })

  it("rejects an over-long description", () => {
    const result = updateCollectionSchema.safeParse({
      name: "Docs",
      description: "a".repeat(COLLECTION_DESCRIPTION_MAX_LENGTH + 1),
    })

    expect(result.success).toBe(false)
  })

  it("strips unknown keys such as a client-sent id or userId", () => {
    const result = updateCollectionSchema.parse({
      name: "Docs",
      id: "other",
      userId: "attacker",
      isFavorite: true,
    })

    expect(result).toEqual({ name: "Docs", description: null })
  })
})
