import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getItemFile } from "@/lib/db/items"
import { getObjectStream } from "@/lib/r2"
import { contentDisposition, contentTypeForKey } from "@/lib/validation/file"

/**
 * Stream an item's file from R2. Same-origin, so the drawer's preview and
 * download need no bucket CORS, and ownership-checked, so the bucket can stay
 * private. `?download=1` forces an attachment; images are otherwise inline.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const file = await getItemFile(session.user.id, id)
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    const object = await getObjectStream(file.key)
    if (!object) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    const download = new URL(request.url).searchParams.get("download") === "1"
    const contentType = contentTypeForKey(file.key)
    const fileName = file.fileName ?? "file"

    const headers = new Headers({
      "Content-Type": contentType,
      "Content-Disposition": contentDisposition(fileName, contentType, download),
      "X-Content-Type-Options": "nosniff",
      // User-uploaded SVG (or anything else) opened directly must not be able
      // to run script on this origin: sandbox it and allow nothing to load.
      "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
      // Not cached: the browser's HTTP cache ignores cookies, so a cached copy
      // would still be served after sign-out or after the item is deleted.
      "Cache-Control": "private, no-store",
    })
    if (object.size !== undefined) {
      headers.set("Content-Length", String(object.size))
    }

    return new Response(object.body, { headers })
  } catch (err) {
    console.error("file download failed", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
