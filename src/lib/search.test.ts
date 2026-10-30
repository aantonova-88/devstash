import { describe, it, expect } from "vitest"
import {
  SEARCH_PREVIEW_LENGTH,
  contentPreview,
  paletteFilter,
  searchPreview,
} from "@/lib/search"

describe("contentPreview", () => {
  it("collapses newlines, tabs and runs of spaces into single spaces", () => {
    expect(contentPreview("  a\n\n\tb   c  ")).toBe("a b c")
  })

  it.each([null, undefined, "", "  \n\t "])("returns null for empty input (%j)", (text) => {
    expect(contentPreview(text)).toBeNull()
  })

  it("keeps text at exactly the limit untouched", () => {
    const text = "a".repeat(SEARCH_PREVIEW_LENGTH)
    expect(contentPreview(text)).toBe(text)
  })

  it("cuts text one over the limit and adds an ellipsis", () => {
    const result = contentPreview("a".repeat(SEARCH_PREVIEW_LENGTH + 1))
    expect(result).toBe(`${"a".repeat(SEARCH_PREVIEW_LENGTH)}…`)
  })

  it("does not leave a trailing space before the ellipsis", () => {
    expect(contentPreview("abcd efgh", 5)).toBe("abcd…")
  })
})

describe("searchPreview", () => {
  it("prefers content, then url, then file name", () => {
    expect(searchPreview({ content: "code", url: "https://a.dev", fileName: "f.txt" })).toBe("code")
    expect(searchPreview({ content: null, url: "https://a.dev", fileName: "f.txt" })).toBe("https://a.dev")
    expect(searchPreview({ content: null, url: null, fileName: "f.txt" })).toBe("f.txt")
  })

  it("skips whitespace-only content", () => {
    expect(searchPreview({ content: " \n ", url: "https://a.dev", fileName: null })).toBe("https://a.dev")
  })

  it("returns null when no field has text", () => {
    expect(searchPreview({ content: null, url: null, fileName: null })).toBeNull()
  })
})

describe("paletteFilter", () => {
  const ITEM = ["Test command", "Command", "npm hello"]

  it("does not match letters scattered across an excerpt", () => {
    // cmdk's default fuzzy score matched this ("Edi-t-ed Saved ... t-hrough").
    expect(
      paletteFilter("item-x", "test", ["Markdown probe", "Note", "## Edited Saved **through** the drawer."])
    ).toBe(0)
  })

  it("does not match letters scattered across a long title", () => {
    expect(
      paletteFilter("item-x", "test", ["List probe with a really long title that should truncate", "File", ""])
    ).toBe(0)
  })

  it("is case-insensitive and ignores surrounding whitespace", () => {
    expect(paletteFilter("item-x", "  TEST  ", ITEM)).toBeGreaterThan(0)
  })

  it("matches words in the type name and the excerpt", () => {
    expect(paletteFilter("item-x", "command", ["Docker", "Command", ""])).toBeGreaterThan(0)
    expect(paletteFilter("item-x", "usestate", ["Hooks", "Snippet", "const [a] = useState()"])).toBeGreaterThan(0)
  })

  it("requires every query word, in any order and across fields", () => {
    const docker = ["Docker — housekeeping", "Command", "docker stop $(docker ps -q)"]
    expect(paletteFilter("item-x", "stop docker", docker)).toBeGreaterThan(0)
    expect(paletteFilter("item-x", "docker kubernetes", docker)).toBe(0)
  })

  it("ranks a name prefix above a name match above a type or excerpt match", () => {
    const prefix = paletteFilter("item-x", "test", ["Test note", "Note", ""])
    const inName = paletteFilter("item-x", "note", ["Test note", "Note", ""])
    const elsewhere = paletteFilter("item-x", "hello", ITEM)

    expect(prefix).toBeGreaterThan(inName)
    expect(inName).toBeGreaterThan(elsewhere)
    expect(elsewhere).toBeGreaterThan(0)
  })

  it("matches a collection, which has only a name keyword", () => {
    expect(paletteFilter("collection-x", "dev", ["DevOps"])).toBe(1)
  })

  it("ignores the value, so an id never produces a match", () => {
    expect(paletteFilter("item-cmpe2zb490002ndsboath284c", "cmpe2z", ["React hooks"])).toBe(0)
  })

  it("matches everything for an empty or whitespace-only query", () => {
    expect(paletteFilter("item-x", "", ITEM)).toBe(1)
    expect(paletteFilter("item-x", "   ", ITEM)).toBe(1)
  })

  it("returns 0 when there are no keywords", () => {
    expect(paletteFilter("item-x", "docker", undefined)).toBe(0)
  })
})
