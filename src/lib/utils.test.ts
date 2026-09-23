import { describe, it, expect, vi, afterEach } from "vitest"
import { cn, relativeTime, formatDate, formatFileSize } from "@/lib/utils"

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

describe("formatDate", () => {
  // formatDate renders in the runtime's local zone, so these build their dates
  // from local components: a hard-coded UTC instant would format as the
  // previous day west of UTC and make the suite fail by timezone.
  it("formats an ISO string as a padded, abbreviated date", () => {
    const localMay3 = new Date(2026, 4, 3, 12)

    expect(formatDate(localMay3.toISOString())).toBe("May 03, 2026")
  })

  it("accepts a Date", () => {
    expect(formatDate(new Date(2026, 11, 25))).toBe("Dec 25, 2026")
  })

  it("pads single-digit days", () => {
    expect(formatDate(new Date(2026, 0, 7))).toBe("Jan 07, 2026")
  })
})

describe("formatFileSize", () => {
  it("reports bytes below 1 KB", () => {
    expect(formatFileSize(0)).toBe("0 B")
    expect(formatFileSize(1023)).toBe("1023 B")
  })

  it("switches to KB at 1024 bytes", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB")
    expect(formatFileSize(1536)).toBe("1.5 KB")
  })

  it("switches to MB at 1024 KB", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB")
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB")
  })
})
