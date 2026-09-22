import { describe, it, expect, vi } from "vitest"
import { isEmailVerificationEnabled } from "@/lib/features"

describe("isEmailVerificationEnabled", () => {
  it("is on in production when the flag is unset", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("EMAIL_VERIFICATION_ENABLED", undefined)
    expect(isEmailVerificationEnabled()).toBe(true)
  })

  it("is off in development when the flag is unset", () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("EMAIL_VERIFICATION_ENABLED", undefined)
    expect(isEmailVerificationEnabled()).toBe(false)
  })

  it("honours an explicit true, case-insensitively", () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("EMAIL_VERIFICATION_ENABLED", "TRUE")
    expect(isEmailVerificationEnabled()).toBe(true)
  })

  it("honours an explicit false even in production", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("EMAIL_VERIFICATION_ENABLED", "false")
    expect(isEmailVerificationEnabled()).toBe(false)
  })

  it("treats any other value as off", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("EMAIL_VERIFICATION_ENABLED", "yes")
    expect(isEmailVerificationEnabled()).toBe(false)
  })
})
