/**
 * Upload rules for the two FILE-category system types. Shared by the client
 * (instant feedback in `FileUpload`) and the server (the upload route and the
 * create action), so both enforce exactly the same limits.
 */

export type FileTypeSlug = "images" | "files"

interface FileConstraint {
  maxBytes: number
  /** Allowed extension → the Content-Type the file is stored and served with. */
  extensions: Record<string, string>
  /** MIME types a browser may report for an allowed file. */
  mimeTypes: Set<string>
}

const MB = 1024 * 1024

export const FILE_CONSTRAINTS: Record<FileTypeSlug, FileConstraint> = {
  images: {
    maxBytes: 5 * MB,
    extensions: {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
    },
    mimeTypes: new Set([
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ]),
  },
  files: {
    maxBytes: 10 * MB,
    extensions: {
      pdf: "application/pdf",
      txt: "text/plain",
      md: "text/markdown",
      json: "application/json",
      yaml: "text/yaml",
      yml: "text/yaml",
      xml: "application/xml",
      csv: "text/csv",
      toml: "application/toml",
      ini: "text/plain",
    },
    mimeTypes: new Set([
      "application/pdf",
      "text/plain",
      "text/markdown",
      "application/json",
      "application/x-yaml",
      "text/yaml",
      "application/xml",
      "text/xml",
      "text/csv",
      "application/toml",
    ]),
  },
}

/**
 * MIME values that carry no information. Browsers report these for extensions
 * they do not recognise (`.toml`, often `.md` and `.yaml`), so they are not
 * grounds for rejection — the extension decides instead.
 */
const UNKNOWN_MIME_TYPES = new Set(["", "application/octet-stream"])

export function isFileTypeSlug(slug: string): slug is FileTypeSlug {
  return slug === "images" || slug === "files"
}

/** Lowercased extension without the dot, or "" when the name has none. */
export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".")
  if (dot <= 0 || dot === fileName.length - 1) return ""
  return fileName.slice(dot + 1).toLowerCase()
}

/** Value for an `<input type="file">` `accept` attribute. */
export function acceptAttribute(slug: FileTypeSlug): string {
  return Object.keys(FILE_CONSTRAINTS[slug].extensions)
    .map((ext) => `.${ext}`)
    .join(",")
}

/** Human-readable list for hints and error messages, e.g. "PNG, JPG, GIF". */
export function describeExtensions(slug: FileTypeSlug): string {
  return Object.keys(FILE_CONSTRAINTS[slug].extensions)
    .map((ext) => ext.toUpperCase())
    .join(", ")
}

export interface UploadCandidate {
  name: string
  size: number
  /** The browser-reported MIME type (`File.type`). */
  type: string
}

export type UploadValidation =
  | { ok: true; extension: string; contentType: string }
  | { ok: false; error: string }

/**
 * Check a file against its type's limits.
 *
 * The extension is authoritative and decides the stored Content-Type; the
 * client-reported MIME is only used to reject an outright mismatch (a `.png`
 * claiming to be `text/html`). The server never stores or serves the MIME the
 * browser sent.
 */
export function validateUpload(
  file: UploadCandidate,
  slug: FileTypeSlug
): UploadValidation {
  const constraint = FILE_CONSTRAINTS[slug]
  const extension = fileExtension(file.name)
  const contentType = constraint.extensions[extension]

  if (!contentType) {
    return {
      ok: false,
      error: `Unsupported file type. Allowed: ${describeExtensions(slug)}.`,
    }
  }

  const mime = file.type.toLowerCase()
  if (!UNKNOWN_MIME_TYPES.has(mime) && !constraint.mimeTypes.has(mime)) {
    return { ok: false, error: "The file's contents don't match its extension." }
  }

  if (file.size <= 0) {
    return { ok: false, error: "The file is empty." }
  }

  if (file.size > constraint.maxBytes) {
    return {
      ok: false,
      error: `File is too large. The limit is ${constraint.maxBytes / MB} MB.`,
    }
  }

  return { ok: true, extension, contentType }
}

/**
 * Strip any path the browser may have included, control characters and
 * surrounding whitespace, and cap the length. The result is only ever used as a
 * display name and download filename — never as part of the storage key.
 */
export function sanitizeFileName(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? ""
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, "").trim()
  return (cleaned || "file").slice(0, 255)
}

/**
 * Storage key for a new upload. The user id and type slug are prefixes so an
 * object can be checked against its owner and type without a lookup; the name
 * part is random so nothing the user supplied ends up in the key.
 */
export function buildObjectKey(
  userId: string,
  slug: FileTypeSlug,
  extension: string,
  id: string = crypto.randomUUID()
): string {
  return `${userId}/${slug}/${id}.${extension}`
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"

/**
 * Whether a client-supplied key is one this user could have been issued for
 * this type. This is what stops a create request attaching another user's
 * object, or an image upload to a File item.
 */
export function isOwnedObjectKey(
  key: string,
  userId: string,
  slug: FileTypeSlug
): boolean {
  if (!userId || !/^[A-Za-z0-9_-]+$/.test(userId)) return false

  const extensions = Object.keys(FILE_CONSTRAINTS[slug].extensions).join("|")
  const pattern = new RegExp(`^${userId}/${slug}/${UUID}\\.(${extensions})$`)
  return pattern.test(key)
}

/** Content-Type for a stored object, derived from its key's extension. */
export function contentTypeForKey(key: string): string {
  const extension = fileExtension(key)
  for (const constraint of Object.values(FILE_CONSTRAINTS)) {
    const type = constraint.extensions[extension]
    if (type) return type
  }
  return "application/octet-stream"
}

/**
 * Images can be shown inline; everything else downloads. SVG is included only
 * because the proxy also sends a sandboxing CSP, so scripts inside one cannot
 * run on this origin even when it is opened directly.
 */
const INLINE_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
])

/**
 * `Content-Disposition` for the download proxy. Images are inline unless a
 * download was asked for, so the drawer can preview them; the filename is sent
 * both as an ASCII fallback and RFC 5987-encoded so non-ASCII names survive.
 */
export function contentDisposition(
  fileName: string,
  contentType: string,
  download: boolean
): string {
  const type =
    !download && INLINE_CONTENT_TYPES.has(contentType) ? "inline" : "attachment"
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_")
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  )
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encoded}`
}
