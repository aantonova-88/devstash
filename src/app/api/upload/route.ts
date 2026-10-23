import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { putObject } from "@/lib/r2"
import {
  FILE_CONSTRAINTS,
  buildObjectKey,
  isFileTypeSlug,
  sanitizeFileName,
  validateUpload,
} from "@/lib/validation/file"

/** Headroom over the largest file for the multipart boundary and form fields. */
const MULTIPART_OVERHEAD = 64 * 1024
const MAX_REQUEST_BYTES =
  Math.max(...Object.values(FILE_CONSTRAINTS).map((c) => c.maxBytes)) +
  MULTIPART_OVERHEAD

/**
 * Upload one file to R2 for a File or Image item that is about to be created.
 *
 * Multipart body: `file` plus `typeSlug` ("images" | "files"). Returns the
 * storage key the create action then attaches to the new item; the key is
 * prefixed with the session user's id and the slug, which is what the action
 * checks before trusting it.
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Reject oversized bodies before buffering them. The real size is checked
    // again below, since Content-Length can be absent or wrong.
    const declared = Number(request.headers.get("content-length"))
    if (declared > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "File is too large." }, { status: 413 })
    }

    const form = await request.formData().catch(() => null)
    const file = form?.get("file")
    const typeSlug = form?.get("typeSlug")

    if (!(file instanceof File) || typeof typeSlug !== "string" || !isFileTypeSlug(typeSlug)) {
      return NextResponse.json({ error: "Invalid upload" }, { status: 400 })
    }

    const fileName = sanitizeFileName(file.name)
    const check = validateUpload({ name: fileName, size: file.size, type: file.type }, typeSlug)
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 })
    }

    const key = buildObjectKey(session.user.id, typeSlug, check.extension)
    const body = new Uint8Array(await file.arrayBuffer())
    await putObject(key, body, check.contentType, fileName)

    return NextResponse.json({ key, fileName, fileSize: body.byteLength })
  } catch (err) {
    console.error("upload failed", err)
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 })
  }
}
