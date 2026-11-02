import { describe, it, expect } from "vitest"
import { pageHref, pageLinks, pageWindow, parsePage, totalPages } from "@/lib/pagination"

describe("parsePage", () => {
  it("parses a positive integer", () => {
    expect(parsePage("1")).toBe(1)
    expect(parsePage("7")).toBe(7)
  })

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["zero", "0"],
    ["negative", "-2"],
    ["decimal", "1.5"],
    ["text", "abc"],
    ["trailing junk", "2abc"],
    ["padded", " 2"],
    ["exponent", "1e3"],
    ["beyond safe integers", "9".repeat(20)],
  ])("falls back to page 1 when %s", (_label, raw) => {
    expect(parsePage(raw)).toBe(1)
  })

  it("falls back to page 1 for a repeated param", () => {
    expect(parsePage(["2", "3"])).toBe(1)
  })
})

describe("pageWindow", () => {
  it("starts page 1 at the first row", () => {
    expect(pageWindow(1, 21)).toEqual({ skip: 0, take: 21 })
  })

  it("skips the rows of the preceding pages", () => {
    expect(pageWindow(3, 21)).toEqual({ skip: 42, take: 21 })
  })
})

describe("totalPages", () => {
  it("reports one page for an empty list", () => {
    expect(totalPages(0, 21)).toBe(1)
  })

  it("fits an exact multiple without a trailing empty page", () => {
    expect(totalPages(21, 21)).toBe(1)
    expect(totalPages(42, 21)).toBe(2)
  })

  it("adds a page for a partial remainder", () => {
    expect(totalPages(22, 21)).toBe(2)
  })
})

describe("pageLinks", () => {
  it("lists a single page", () => {
    expect(pageLinks(1, 1)).toEqual([1])
  })

  it("lists every page when there are no gaps", () => {
    expect(pageLinks(3, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it("collapses gaps on both sides of the current page", () => {
    expect(pageLinks(5, 10)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 10])
  })

  it("keeps the first and last page from the edges", () => {
    expect(pageLinks(1, 10)).toEqual([1, 2, "ellipsis", 10])
    expect(pageLinks(10, 10)).toEqual([1, "ellipsis", 9, 10])
  })

  it("shows a one-page gap as the page rather than an ellipsis", () => {
    expect(pageLinks(4, 10)).toEqual([1, 2, 3, 4, 5, "ellipsis", 10])
  })

  it("honours a wider sibling count", () => {
    expect(pageLinks(10, 20, 2)).toEqual([1, "ellipsis", 8, 9, 10, 11, 12, "ellipsis", 20])
  })
})

describe("pageHref", () => {
  it("links page 1 to the bare path", () => {
    expect(pageHref("/collections", 1)).toBe("/collections")
  })

  it("adds the page param for later pages", () => {
    expect(pageHref("/items/snippets", 3)).toBe("/items/snippets?page=3")
  })
})
