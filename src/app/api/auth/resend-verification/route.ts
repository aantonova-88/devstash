import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isEmailVerificationEnabled } from "@/lib/features"
import { getBaseUrl, issueVerificationEmail } from "@/lib/verification"

export async function POST(request: Request) {
  try {
    if (!isEmailVerificationEnabled()) {
      return NextResponse.json({ success: true })
    }

    const body = await request.json().catch(() => ({}))
    const { email } = body as { email?: string }

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { email: true, name: true, emailVerified: true, password: true },
    })

    if (user?.password && !user.emailVerified) {
      try {
        await issueVerificationEmail({
          email: user.email,
          name: user.name,
          baseUrl: getBaseUrl(request),
        })
      } catch (err) {
        console.error("Failed to resend verification email", err)
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
