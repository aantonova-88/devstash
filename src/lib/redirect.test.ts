import { describe, it, expect } from "vitest"
import { DEFAULT_AFTER_SIGN_IN, safeCallbackUrl } from "@/lib/redirect"

const ORIGIN = "http://localhost:3000"

describe("safeCallbackUrl", () => {
  it("falls back when missing or empty", () => {
    expect(safeCallbackUrl(null, ORIGIN)).toBe(DEFAULT_AFTER_SIGN_IN)
    expect(safeCallbackUrl(undefined, ORIGIN)).toBe(DEFAULT_AFTER_SIGN_IN)
    expect(safeCallbackUrl("", ORIGIN)).toBe(DEFAULT_AFTER_SIGN_IN)
  })

  it("keeps a relative path with its query and hash", () => {
    expect(safeCallbackUrl("/items/snippets?x=1#top", ORIGIN)).toBe("/items/snippets?x=1#top")
  })

  it("reduces a same-origin absolute URL to its path", () => {
    expect(safeCallbackUrl("http://localhost:3000/profile?tab=a", ORIGIN)).toBe("/profile?tab=a")
  })

  it.each([
    "https://evil.example",
    "https://evil.example/dashboard",
    "//evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "/\t/evil.example",
    "http://localhost:3001/dashboard",
    "https://localhost:3000/dashboard",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
  ])("rejects off-origin target %s", (raw) => {
    expect(safeCallbackUrl(raw, ORIGIN)).toBe(DEFAULT_AFTER_SIGN_IN)
  })

  it("uses the supplied fallback", () => {
    expect(safeCallbackUrl("https://evil.example", ORIGIN, "/home")).toBe("/home")
  })

  it("falls back when the origin itself is malformed", () => {
    expect(safeCallbackUrl("/dashboard", "not a url")).toBe(DEFAULT_AFTER_SIGN_IN)
  })
})
