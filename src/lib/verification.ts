import { randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"
import { sendVerificationEmail } from "@/lib/email"

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000

export function getBaseUrl(request: Request): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL
  if (process.env.AUTH_URL) return process.env.AUTH_URL
  return new URL(request.url).origin
}

export async function issueVerificationEmail(opts: {
  email: string
  name?: string | null
  baseUrl: string
}) {
  const { email, name, baseUrl } = opts

  await prisma.verificationToken.deleteMany({ where: { identifier: email } })

  const token = randomBytes(32).toString("hex")
  const expires = new Date(Date.now() + TOKEN_TTL_MS)

  await prisma.verificationToken.create({
    data: { identifier: email, token, expires },
  })

  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`
  await sendVerificationEmail({ to: email, name, verifyUrl })
}

type ConsumeResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" }

export async function consumeVerificationToken(token: string): Promise<ConsumeResult> {
  const record = await prisma.verificationToken.findUnique({ where: { token } })
  if (!record) return { ok: false, reason: "invalid" }

  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {})
    return { ok: false, reason: "expired" }
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { email: record.identifier },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.delete({ where: { token } }),
  ])

  return { ok: true }
}
