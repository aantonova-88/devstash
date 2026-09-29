import { describe, it, expect } from "vitest"
import { updateItemSchema, parseTagInput } from "@/lib/validation/item"

const VALID = {
  title: "useDebounce hook",
  description: "A reusable React hook",
  content: "export function useDebounce() {}",
  language: "typescript",
  url: null,
  tags: ["react"],
}

function parse(overrides: Record<string, unknown> = {}) {
  return updateItemSchema.safeParse({ ...VALID, ...overrides })
}

describe("updateItemSchema", () => {
  describe("title", () => {
    it("trims surrounding whitespace", () => {
      const result = parse({ title: "  Spaced title  " })
      expect(result.success && result.data.title).toBe("Spaced title")
    })

    it("rejects an empty title", () => {
      const result = parse({ title: "" })
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe("Title is required")
    })

    it("rejects a title that is only whitespace", () => {
      const result = parse({ title: "   " })
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe("Title is required")
    })

    it("rejects a title over 200 characters", () => {
      const result = parse({ title: "a".repeat(201) })
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe("Title is too long")
    })

    it("accepts a title of exactly 200 characters", () => {
      expect(parse({ title: "a".repeat(200) }).success).toBe(true)
    })
  })

  describe("optional text fields", () => {
    it("normalises an empty string to null so a cleared input clears the column", () => {
      const result = parse({ description: "", content: "", language: "" })
      expect(result.success).toBe(true)
      expect(result.success && result.data.description).toBeNull()
      expect(result.success && result.data.content).toBeNull()
      expect(result.success && result.data.language).toBeNull()
    })

    it("normalises a whitespace-only string to null", () => {
      const result = parse({ description: "   \n  " })
      expect(result.success && result.data.description).toBeNull()
    })

    it("accepts an explicit null", () => {
      const result = parse({ description: null, content: null })
      expect(result.success).toBe(true)
    })

    it("defaults to null when the field is omitted entirely", () => {
      const result = updateItemSchema.safeParse({ title: "Only a title" })
      expect(result.success).toBe(true)
      expect(result.success && result.data.description).toBeNull()
      expect(result.success && result.data.content).toBeNull()
      expect(result.success && result.data.url).toBeNull()
      expect(result.success && result.data.tags).toEqual([])
    })
  })

  describe("url", () => {
    it.each(["https://example.com", "http://example.com/a/b?c=1"])(
      "accepts %s",
      (url) => {
        expect(parse({ url }).success).toBe(true)
      }
    )

    it.each(["not a url", "example.com", "ftp://example.com", "javascript:alert(1)"])(
      "rejects %s",
      (url) => {
        const result = parse({ url })
        expect(result.success).toBe(false)
        expect(result.error?.issues[0].message).toBe(
          "Enter a valid URL starting with http:// or https://"
        )
      }
    )

    it("accepts a cleared url as null rather than failing validation", () => {
      const result = parse({ url: "" })
      expect(result.success).toBe(true)
      expect(result.success && result.data.url).toBeNull()
    })
  })

  describe("tags", () => {
    it("trims each tag", () => {
      const result = parse({ tags: ["  react  ", "hooks"] })
      expect(result.success && result.data.tags).toEqual(["react", "hooks"])
    })

    it("rejects an empty tag", () => {
      const result = parse({ tags: ["react", "  "] })
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe("Tags cannot be empty")
    })

    it("accepts an empty list", () => {
      const result = parse({ tags: [] })
      expect(result.success && result.data.tags).toEqual([])
    })

    it("rejects more than 20 tags", () => {
      const result = parse({ tags: Array.from({ length: 21 }, (_, i) => `t${i}`) })
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe("An item can have at most 20 tags")
    })

    it("accepts exactly 20 tags", () => {
      const result = parse({ tags: Array.from({ length: 20 }, (_, i) => `t${i}`) })
      expect(result.success).toBe(true)
    })
  })
})

describe("parseTagInput", () => {
  it("splits on commas and trims each entry", () => {
    expect(parseTagInput("react, hooks ,  patterns")).toEqual([
      "react",
      "hooks",
      "patterns",
    ])
  })

  it("returns an empty list for an empty string", () => {
    expect(parseTagInput("")).toEqual([])
  })

  it("returns an empty list for commas and whitespace only", () => {
    expect(parseTagInput("  , , ,  ")).toEqual([])
  })

  it("drops empty segments from trailing and doubled commas", () => {
    expect(parseTagInput("react,,hooks,")).toEqual(["react", "hooks"])
  })

  it("deduplicates case-insensitively, keeping the first spelling", () => {
    expect(parseTagInput("React, react, REACT")).toEqual(["React"])
  })

  it("keeps tags containing internal spaces intact", () => {
    expect(parseTagInput("server components, react")).toEqual([
      "server components",
      "react",
    ])
  })
})
