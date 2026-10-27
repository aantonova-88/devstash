import { describe, it, expect, vi, beforeEach } from "vitest"

const send = vi.fn()

// email.ts builds a Resend client at module scope; mock it so nothing is sent.
vi.mock("resend", () => ({
  Resend: class {
    emails = { send }
  },
}))

const { escapeHtml, sendVerificationEmail, sendPasswordResetEmail } = await import("@/lib/email")

const HOSTILE_NAME = `<a href="https://evil.example">Click</a> & 'x'`

function lastMessage() {
  return send.mock.calls.at(-1)?.[0] as { html: string; text: string }
}

beforeEach(() => {
  send.mockReset()
})

describe("escapeHtml", () => {
  it("escapes every HTML-significant character", () => {
    expect(escapeHtml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#39;")
  })

  it("leaves plain text untouched", () => {
    expect(escapeHtml("Anna Antonova")).toBe("Anna Antonova")
  })
})

describe.each([
  ["sendVerificationEmail", () => sendVerificationEmail({ to: "a@x.com", name: HOSTILE_NAME, verifyUrl: "https://devstash.io/v" })],
  ["sendPasswordResetEmail", () => sendPasswordResetEmail({ to: "a@x.com", name: HOSTILE_NAME, resetUrl: "https://devstash.io/r" })],
])("%s", (_, sendIt) => {
  it("escapes the user's name in the HTML body", async () => {
    await sendIt()
    const { html } = lastMessage()
    expect(html).not.toContain(HOSTILE_NAME)
    expect(html).not.toContain("evil.example\">")
    expect(html).toContain("Hi &lt;a href=&quot;https://evil.example&quot;&gt;Click&lt;/a&gt; &amp; &#39;x&#39;,")
  })

  it("keeps the name verbatim in the plain-text body", async () => {
    await sendIt()
    expect(lastMessage().text.startsWith(`Hi ${HOSTILE_NAME},`)).toBe(true)
  })
})

describe("greeting without a name", () => {
  it("falls back to a bare greeting", async () => {
    await sendVerificationEmail({ to: "a@x.com", name: null, verifyUrl: "https://devstash.io/v" })
    expect(lastMessage().html).toContain(">Hi,</p>")
  })
})
