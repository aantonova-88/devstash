import { describe, it, expect, vi, afterEach } from "vitest"
import { cn, relativeTime } from "@/lib/utils"

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1")
  })

  it("drops falsy values", () => {
    expect(cn("px-2", false && "hidden", undefined, null)).toBe("px-2")
  })

  it("lets the last conflicting Tailwind class win", () => {
    expect(cn("px-2", "px-4")).toBe("px-4")
  })

  it("supports conditional object syntax", () => {
    expect(cn("base", { active: true, disabled: false })).toBe("base active")
  })
})

describe("relativeTime", () => {
  const NOW = new Date("2026-09-22T12:00:00.000Z")

  function ago(ms: number) {
    return new Date(NOW.getTime() - ms)
  }

  afterEach(() => {
    vi.useRealTimers()
  })

  function freeze() {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  }

  it("reports minutes under an hour", () => {
    freeze()
    expect(relativeTime(ago(5 * 60_000))).toBe("5m ago")
    expect(relativeTime(ago(59 * 60_000))).toBe("59m ago")
  })

  it("reports 0m for something that just happened", () => {
    freeze()
    expect(relativeTime(NOW)).toBe("0m ago")
  })

  it("switches to hours at 60 minutes", () => {
    freeze()
    expect(relativeTime(ago(60 * 60_000))).toBe("1h ago")
    expect(relativeTime(ago(23 * 60 * 60_000))).toBe("23h ago")
  })

  it("switches to days at 24 hours", () => {
    freeze()
    expect(relativeTime(ago(24 * 60 * 60_000))).toBe("1d ago")
    expect(relativeTime(ago(10 * 24 * 60 * 60_000))).toBe("10d ago")
  })

  it("accepts an ISO string as well as a Date", () => {
    freeze()
    expect(relativeTime(ago(2 * 60 * 60_000).toISOString())).toBe("2h ago")
  })
})
