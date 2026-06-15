import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { consumePasswordResetToken } from "@/lib/password-reset"
import {
  checkRateLimit,
  getClientIp,
  resetPasswordLimiter,
  tooManyRequestsResponse,
} from "@/lib/rate-limit"

export async function POST(request: Request) {
  try {
    const ipLimit = await checkRateLimit(resetPasswordLimiter, getClientIp(request))
    if (!ipLimit.success) return tooManyRequestsResponse(ipLimit)

    const body = await request.json().catch(() => ({}))
    const { token, password, confirmPassword } = body as {
      token?: string
      password?: string
      confirmPassword?: string
    }

    if (!token || !password || !confirmPassword) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      )
    }

    const hashed = await bcrypt.hash(password, 12)
    const result = await consumePasswordResetToken(token, hashed)

    if (!result.ok) {
      const message =
        result.reason === "expired"
          ? "That reset link has expired. Please request a new one."
          : "That reset link is invalid or has already been used."
      return NextResponse.json({ error: message, reason: result.reason }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
