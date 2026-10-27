import { NextResponse } from "next/server"
import { consumeVerificationToken, getBaseUrl } from "@/lib/verification"

export async function GET(request: Request) {
  try {
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
  } catch (err) {
    console.error("verify email failed", err)
    // getBaseUrl may be what threw, so redirect relative to the request; the
    // target is a fixed path on the host the user's own link already hit.
    return NextResponse.redirect(new URL("/sign-in?verify=error", request.url))
  }
}
