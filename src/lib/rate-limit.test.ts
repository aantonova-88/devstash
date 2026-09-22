import { describe, it, expect, vi } from "vitest"
import type { Ratelimit } from "@upstash/ratelimit"
import {
  checkRateLimit,
  formatRetryAfter,
  getClientIp,
  tooManyRequestsResponse,
} from "@/lib/rate-limit"

function requestWith(headers: Record<string, string>) {
  return new Request("https://devstash.io/api/auth/login", { headers })
}

/** Minimal stand-in for an Upstash limiter — only `limit()` is used. */
function fakeLimiter(impl: () => Promise<unknown>): Ratelimit {
  return { limit: impl } as unknown as Ratelimit
}

describe("getClientIp", () => {
  it("prefers the first entry of x-forwarded-for", () => {
    const request = requestWith({ "x-forwarded-for": "203.0.113.5, 70.41.3.18" })
    expect(getClientIp(request)).toBe("203.0.113.5")
  })

  it("trims whitespace around the forwarded address", () => {
    const request = requestWith({ "x-forwarded-for": "  203.0.113.5  " })
    expect(getClientIp(request)).toBe("203.0.113.5")
  })

  it("falls back to x-real-ip", () => {
    const request = requestWith({ "x-real-ip": "198.51.100.9" })
    expect(getClientIp(request)).toBe("198.51.100.9")
  })

  it("returns 'unknown' when neither header is present", () => {
    expect(getClientIp(requestWith({}))).toBe("unknown")
  })
})

describe("formatRetryAfter", () => {
  it("returns 'a moment' for zero or negative values", () => {
    expect(formatRetryAfter(0)).toBe("a moment")
    expect(formatRetryAfter(-5)).toBe("a moment")
  })

  it("pluralises seconds", () => {
    expect(formatRetryAfter(1)).toBe("1 second")
    expect(formatRetryAfter(45)).toBe("45 seconds")
  })

  it("rounds up to whole minutes", () => {
    expect(formatRetryAfter(60)).toBe("1 minute")
    expect(formatRetryAfter(61)).toBe("2 minutes")
  })

  it("rounds up to whole hours", () => {
    expect(formatRetryAfter(3600)).toBe("1 hour")
    expect(formatRetryAfter(3601)).toBe("2 hours")
  })
})

describe("checkRateLimit", () => {
  it("allows when no limiter is configured (Upstash env vars missing)", async () => {
    const result = await checkRateLimit(null, "ip:203.0.113.5")
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(Number.POSITIVE_INFINITY)
  })

  it("fails open when the limiter throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const limiter = fakeLimiter(() => Promise.reject(new Error("upstash down")))

    const result = await checkRateLimit(limiter, "ip:203.0.113.5")

    expect(result.success).toBe(true)
    expect(consoleError).toHaveBeenCalled()
  })

  it("passes through a successful limiter result", async () => {
    const limiter = fakeLimiter(() =>
      Promise.resolve({ success: true, remaining: 4, reset: Date.now() + 90_000 }),
    )

    const result = await checkRateLimit(limiter, "ip:203.0.113.5")

    expect(result.success).toBe(true)
    expect(result.remaining).toBe(4)
    expect(result.retryAfterSeconds).toBeGreaterThan(0)
  })

  it("derives retryAfterSeconds from the reset timestamp", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-22T12:00:00.000Z"))
    const limiter = fakeLimiter(() =>
      Promise.resolve({ success: false, remaining: 0, reset: Date.now() + 120_000 }),
    )

    const result = await checkRateLimit(limiter, "ip:203.0.113.5")

    expect(result.success).toBe(false)
    expect(result.retryAfterSeconds).toBe(120)
    vi.useRealTimers()
  })

  it("never returns a negative retryAfterSeconds for a reset in the past", async () => {
    const limiter = fakeLimiter(() =>
      Promise.resolve({ success: false, remaining: 0, reset: Date.now() - 5_000 }),
    )

    const result = await checkRateLimit(limiter, "ip:203.0.113.5")

    expect(result.retryAfterSeconds).toBe(0)
  })
})

describe("tooManyRequestsResponse", () => {
  it("returns a 429 with a human-readable message and Retry-After header", async () => {
    const response = tooManyRequestsResponse({
      success: false,
      remaining: 0,
      reset: 0,
      retryAfterSeconds: 120,
    })

    expect(response.status).toBe(429)
    expect(response.headers.get("Retry-After")).toBe("120")
    await expect(response.json()).resolves.toEqual({
      error: "Too many attempts. Please try again in 2 minutes.",
    })
  })

  it("clamps the Retry-After header to at least 1 second", () => {
    const response = tooManyRequestsResponse({
      success: false,
      remaining: 0,
      reset: 0,
      retryAfterSeconds: 0,
    })

    expect(response.headers.get("Retry-After")).toBe("1")
  })
})
