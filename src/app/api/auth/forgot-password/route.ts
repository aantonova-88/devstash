import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBaseUrl } from "@/lib/verification"
import { issuePasswordResetEmail } from "@/lib/password-reset"
import {
  checkRateLimit,
  forgotPasswordLimiter,
  getClientIp,
  tooManyRequestsResponse,
} from "@/lib/rate-limit"

export async function POST(request: Request) {
  try {
    const ipLimit = await checkRateLimit(forgotPasswordLimiter, getClientIp(request))
    if (!ipLimit.success) return tooManyRequestsResponse(ipLimit)

    const body = await request.json().catch(() => ({}))
    const { email } = body as { email?: string }

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { email: true, name: true, password: true },
    })

    if (user?.password) {
      try {
        await issuePasswordResetEmail({
          email: user.email,
          name: user.name,
          baseUrl: getBaseUrl(request),
        })
      } catch (err) {
        console.error("Failed to send password reset email", err)
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
