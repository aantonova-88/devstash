import { describe, it, expect, vi, beforeEach } from "vitest"

const findUnique = vi.fn()
const deleteToken = vi.fn()
const updateUser = vi.fn()
const transaction = vi.fn()
const hash = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    verificationToken: { findUnique, delete: deleteToken },
    user: { update: updateUser },
    $transaction: transaction,
  },
}))
vi.mock("@/lib/email", () => ({ sendPasswordResetEmail: vi.fn() }))
vi.mock("bcryptjs", () => ({ default: { hash } }))

const { consumePasswordResetToken } = await import("@/lib/password-reset")

const HOUR = 60 * 60 * 1000

function tokenRow(overrides: Record<string, unknown> = {}) {
  return {
    identifier: "password-reset:demo@devstash.io",
    token: "tok",
    expires: new Date(Date.now() + HOUR),
    ...overrides,
  }
}

beforeEach(() => {
  findUnique.mockReset()
  deleteToken.mockReset().mockResolvedValue({})
  updateUser.mockReset().mockReturnValue("update-op")
  transaction.mockReset().mockResolvedValue([])
  hash.mockReset().mockResolvedValue("hashed-pw")
})

describe("consumePasswordResetToken", () => {
  it("rejects an unknown token without hashing", async () => {
    findUnique.mockResolvedValue(null)

    await expect(consumePasswordResetToken("nope", "newpassword")).resolves.toEqual({
      ok: false,
      reason: "invalid",
    })
    expect(hash).not.toHaveBeenCalled()
    expect(transaction).not.toHaveBeenCalled()
  })

  it("rejects an email-verification token without hashing", async () => {
    findUnique.mockResolvedValue(tokenRow({ identifier: "demo@devstash.io" }))

    await expect(consumePasswordResetToken("tok", "newpassword")).resolves.toEqual({
      ok: false,
      reason: "invalid",
    })
    expect(hash).not.toHaveBeenCalled()
  })

  it("rejects and deletes an expired token without hashing", async () => {
    findUnique.mockResolvedValue(tokenRow({ expires: new Date(Date.now() - 1000) }))

    await expect(consumePasswordResetToken("tok", "newpassword")).resolves.toEqual({
      ok: false,
      reason: "expired",
    })
    expect(deleteToken).toHaveBeenCalledWith({ where: { token: "tok" } })
    expect(hash).not.toHaveBeenCalled()
    expect(transaction).not.toHaveBeenCalled()
  })

  it("hashes the new password at cost 12 and stores the hash for a valid token", async () => {
    findUnique.mockResolvedValue(tokenRow())

    await expect(consumePasswordResetToken("tok", "newpassword")).resolves.toEqual({ ok: true })
    expect(hash).toHaveBeenCalledWith("newpassword", 12)
    expect(updateUser).toHaveBeenCalledWith({
      where: { email: "demo@devstash.io" },
      data: { password: "hashed-pw" },
    })
    expect(transaction).toHaveBeenCalledOnce()
  })

  it("reports invalid when the transaction fails", async () => {
    findUnique.mockResolvedValue(tokenRow())
    transaction.mockRejectedValue(new Error("P2025"))

    await expect(consumePasswordResetToken("tok", "newpassword")).resolves.toEqual({
      ok: false,
      reason: "invalid",
    })
  })
})
