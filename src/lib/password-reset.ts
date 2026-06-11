import { randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"
import { sendPasswordResetEmail } from "@/lib/email"

const TOKEN_TTL_MS = 60 * 60 * 1000
const IDENTIFIER_PREFIX = "password-reset:"

function identifierFor(email: string) {
  return `${IDENTIFIER_PREFIX}${email}`
}

export async function issuePasswordResetEmail(opts: {
  email: string
  name?: string | null
  baseUrl: string
}) {
  const { email, name, baseUrl } = opts
  const identifier = identifierFor(email)

  await prisma.verificationToken.deleteMany({ where: { identifier } })

  const token = randomBytes(32).toString("hex")
  const expires = new Date(Date.now() + TOKEN_TTL_MS)

  await prisma.verificationToken.create({
    data: { identifier, token, expires },
  })

  const resetUrl = `${baseUrl}/reset-password?token=${token}`
  await sendPasswordResetEmail({ to: email, name, resetUrl })
}

type ConsumeResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" }

export async function consumePasswordResetToken(
  token: string,
  newPasswordHash: string,
): Promise<ConsumeResult> {
  const record = await prisma.verificationToken.findUnique({ where: { token } })
  if (!record || !record.identifier.startsWith(IDENTIFIER_PREFIX)) {
    return { ok: false, reason: "invalid" }
  }

  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {})
    return { ok: false, reason: "expired" }
  }

  const email = record.identifier.slice(IDENTIFIER_PREFIX.length)

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { password: newPasswordHash },
      }),
      prisma.verificationToken.delete({ where: { token } }),
    ])
  } catch {
    return { ok: false, reason: "invalid" }
  }

  return { ok: true }
}
