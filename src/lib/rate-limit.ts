import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

export type RateLimitResult = {
  success: boolean
  remaining: number
  reset: number
  retryAfterSeconds: number
}

const ALLOW: RateLimitResult = {
  success: true,
  remaining: Number.POSITIVE_INFINITY,
  reset: 0,
  retryAfterSeconds: 0,
}

function buildRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

const redis = buildRedis()

function buildLimiter(requests: number, window: Parameters<typeof Ratelimit.slidingWindow>[1], prefix: string) {
  if (!redis) return null
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix: `devstash:rl:${prefix}`,
    analytics: false,
  })
}

export const loginLimiter = buildLimiter(5, "15 m", "login")
export const registerLimiter = buildLimiter(3, "1 h", "register")
export const forgotPasswordLimiter = buildLimiter(3, "1 h", "forgot")
export const resetPasswordLimiter = buildLimiter(5, "15 m", "reset")
export const resendVerificationLimiter = buildLimiter(3, "15 m", "resend")

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }
  const real = request.headers.get("x-real-ip")
  if (real) return real.trim()
  return "unknown"
}

export async function checkRateLimit(
  limiter: Ratelimit | null,
  key: string,
): Promise<RateLimitResult> {
  if (!limiter) return ALLOW
  try {
    const result = await limiter.limit(key)
    const retryAfterSeconds = Math.max(0, Math.ceil((result.reset - Date.now()) / 1000))
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
      retryAfterSeconds,
    }
  } catch (err) {
    console.error("Rate limit check failed; failing open", err)
    return ALLOW
  }
}

export function formatRetryAfter(seconds: number): string {
  if (seconds <= 0) return "a moment"
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`
  const hours = Math.ceil(minutes / 60)
  return `${hours} hour${hours === 1 ? "" : "s"}`
}

export function tooManyRequestsResponse(result: RateLimitResult): NextResponse {
  const wait = formatRetryAfter(result.retryAfterSeconds)
  return NextResponse.json(
    { error: `Too many attempts. Please try again in ${wait}.` },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, result.retryAfterSeconds)),
      },
    },
  )
}
