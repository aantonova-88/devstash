import { NextResponse } from "next/server"
import { consumeVerificationToken, getBaseUrl } from "@/lib/verification"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get("token")
  const base = getBaseUrl(request)

  if (!token) {
    return NextResponse.redirect(`${base}/sign-in?verify=invalid`)
  }

  const result = await consumeVerificationToken(token)

  if (!result.ok) {
    return NextResponse.redirect(`${base}/sign-in?verify=${result.reason}`)
  }

  return NextResponse.redirect(`${base}/sign-in?verified=1`)
}
