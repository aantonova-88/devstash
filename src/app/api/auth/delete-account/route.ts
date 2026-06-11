import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { confirmEmail } = body as { confirmEmail?: string }

    if (!confirmEmail || confirmEmail.trim().toLowerCase() !== session.user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "Email confirmation does not match" },
        { status: 400 },
      )
    }

    await prisma.user.delete({ where: { id: session.user.id } })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
