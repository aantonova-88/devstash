import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const success = vi.fn()
const error = vi.fn()

vi.mock("sonner", () => ({ toast: { success, error } }))

const { copyToClipboard } = await import("@/lib/clipboard")

beforeEach(() => {
  success.mockReset()
  error.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubClipboard(writeText: (value: string) => Promise<void>) {
  const spy = vi.fn(writeText)
  vi.stubGlobal("navigator", { clipboard: { writeText: spy } })
  return spy
}

describe("copyToClipboard", () => {
  it("writes the value and shows a success toast", async () => {
    const writeText = stubClipboard(async () => {})

    await expect(copyToClipboard("npm run dev")).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith("npm run dev")
    expect(success).toHaveBeenCalledWith("Copied to clipboard")
    expect(error).not.toHaveBeenCalled()
  })

  it("shows an error toast and resolves false when the write is rejected", async () => {
    stubClipboard(async () => {
      throw new DOMException("Denied", "NotAllowedError")
    })

    await expect(copyToClipboard("x")).resolves.toBe(false)
    expect(error).toHaveBeenCalledWith("Could not copy to clipboard")
    expect(success).not.toHaveBeenCalled()
  })

  it("handles a missing clipboard API without rejecting", async () => {
    vi.stubGlobal("navigator", {})

    await expect(copyToClipboard("x")).resolves.toBe(false)
    expect(error).toHaveBeenCalledOnce()
  })
})
