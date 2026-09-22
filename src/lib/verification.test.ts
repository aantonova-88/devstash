import { describe, it, expect, vi } from "vitest"

// verification.ts imports the Prisma client at module scope; mocking it keeps the
// suite hermetic and offline. Every DB-touching module under test needs this.
vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/email", () => ({ sendVerificationEmail: vi.fn() }))

const { getBaseUrl } = await import("@/lib/verification")

function requestTo(url: string) {
  return new Request(url)
}

describe("getBaseUrl", () => {
  it("prefers NEXTAUTH_URL", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://devstash.io")
    vi.stubEnv("AUTH_URL", "https://fallback.example")
    expect(getBaseUrl(requestTo("http://localhost:3000/api/auth/register"))).toBe(
      "https://devstash.io",
    )
  })

  it("falls back to AUTH_URL", () => {
    vi.stubEnv("NEXTAUTH_URL", undefined)
    vi.stubEnv("AUTH_URL", "https://fallback.example")
    expect(getBaseUrl(requestTo("http://localhost:3000/api/auth/register"))).toBe(
      "https://fallback.example",
    )
  })

  it("falls back to the request origin, dropping the path", () => {
    vi.stubEnv("NEXTAUTH_URL", undefined)
    vi.stubEnv("AUTH_URL", undefined)
    expect(getBaseUrl(requestTo("http://localhost:3000/api/auth/register?x=1"))).toBe(
      "http://localhost:3000",
    )
  })
})
