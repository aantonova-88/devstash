import { describe, it, expect, vi, beforeEach } from "vitest"

const findUnique = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique } },
}))

const { getProfileUser } = await import("@/lib/db/users")

const ROW = {
  id: "user_1",
  name: "Demo User",
  email: "demo@devstash.io",
  image: null,
  password: "$2b$12$hash",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
}

beforeEach(() => {
  findUnique.mockReset()
})

describe("getProfileUser", () => {
  it("looks the user up by id", async () => {
    findUnique.mockResolvedValue(ROW)
    await getProfileUser("user_1")
    expect(findUnique.mock.calls[0][0].where).toEqual({ id: "user_1" })
  })

  it("reports hasPassword and never returns the hash", async () => {
    findUnique.mockResolvedValue(ROW)
    const user = await getProfileUser("user_1")

    expect(user).toEqual({
      id: "user_1",
      name: "Demo User",
      email: "demo@devstash.io",
      image: null,
      createdAt: ROW.createdAt,
      hasPassword: true,
    })
    expect(user).not.toHaveProperty("password")
  })

  it("reports no password for an OAuth-only user", async () => {
    findUnique.mockResolvedValue({ ...ROW, password: null })
    expect((await getProfileUser("user_1"))?.hasPassword).toBe(false)
  })

  it("returns null for an unknown user", async () => {
    findUnique.mockResolvedValue(null)
    expect(await getProfileUser("missing")).toBeNull()
  })
})
