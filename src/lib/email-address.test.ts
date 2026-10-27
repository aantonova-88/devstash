import { describe, it, expect } from "vitest"
import { emailMatch, normalizeEmail } from "@/lib/email-address"

describe("normalizeEmail", () => {
  it("lowercases", () => {
    expect(normalizeEmail("Anna@Example.COM")).toBe("anna@example.com")
  })

  it("trims surrounding whitespace", () => {
    expect(normalizeEmail("  a@x.com\n")).toBe("a@x.com")
  })

  it("leaves an already-normal address unchanged", () => {
    expect(normalizeEmail("a@x.com")).toBe("a@x.com")
  })
})

describe("emailMatch", () => {
  it("builds a case-insensitive equality filter on the normalized address", () => {
    expect(emailMatch(" A@X.com ")).toEqual({
      email: { equals: "a@x.com", mode: "insensitive" },
    })
  })
})
