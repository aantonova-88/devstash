import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { emailMatch, MAX_NAME_LENGTH, normalizeEmail } from "@/lib/email-address"
import { isEmailVerificationEnabled } from "@/lib/features"
import { getBaseUrl, issueVerificationEmail } from "@/lib/verification"
import {
  checkRateLimit,
  getClientIp,
  registerLimiter,
  tooManyRequestsResponse,
} from "@/lib/rate-limit"

export async function POST(request: Request) {
  try {
    const ipLimit = await checkRateLimit(registerLimiter, getClientIp(request))
    if (!ipLimit.success) return tooManyRequestsResponse(ipLimit)

    const body = await request.json().catch(() => ({}))
    const { name: rawName, email: rawEmail, password, confirmPassword } = body as {
      name?: unknown
      email?: unknown
      password?: unknown
      confirmPassword?: unknown
    }

    if (
      typeof rawName !== "string" ||
      typeof rawEmail !== "string" ||
      typeof password !== "string" ||
      typeof confirmPassword !== "string"
    ) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    const name = rawName.trim()
    const email = normalizeEmail(rawEmail)

    if (!name || !email || !password || !confirmPassword) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    if (name.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Name must be at most ${MAX_NAME_LENGTH} characters` },
        { status: 400 },
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    const existing = await prisma.user.findFirst({ where: emailMatch(email), select: { id: true } })
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)
    const verificationEnabled = isEmailVerificationEnabled()
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        emailVerified: verificationEnabled ? null : new Date(),
      },
      select: { id: true, name: true, email: true },
    })

    if (verificationEnabled) {
      try {
        await issueVerificationEmail({
          email: user.email,
          name: user.name,
          baseUrl: getBaseUrl(request),
        })
      } catch (err) {
        console.error("Failed to send verification email", err)
      }
    }

    return NextResponse.json(
      { success: true, user, verificationRequired: verificationEnabled },
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
