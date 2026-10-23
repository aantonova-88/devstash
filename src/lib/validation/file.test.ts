import { describe, it, expect } from "vitest"
import {
  FILE_CONSTRAINTS,
  acceptAttribute,
  buildObjectKey,
  contentDisposition,
  contentTypeForKey,
  fileExtension,
  isFileTypeSlug,
  isOwnedObjectKey,
  sanitizeFileName,
  validateUpload,
} from "@/lib/validation/file"

const MB = 1024 * 1024
const UUID = "0b9f0a52-3c1e-4c55-9d7e-2f1f3a6b8c90"

describe("isFileTypeSlug", () => {
  it("accepts exactly the two FILE slugs", () => {
    expect(isFileTypeSlug("images")).toBe(true)
    expect(isFileTypeSlug("files")).toBe(true)
    expect(isFileTypeSlug("snippets")).toBe(false)
    expect(isFileTypeSlug("Images")).toBe(false)
  })
})

describe("fileExtension", () => {
  it.each([
    ["photo.PNG", "png"],
    ["archive.tar.gz", "gz"],
    ["noext", ""],
    [".env", ""],
    ["trailing.", ""],
  ])("%s → %j", (name, ext) => {
    expect(fileExtension(name)).toBe(ext)
  })
})

describe("acceptAttribute", () => {
  it("lists every allowed extension with a dot", () => {
    expect(acceptAttribute("images")).toBe(".png,.jpg,.jpeg,.gif,.webp,.svg")
  })
})

describe("validateUpload", () => {
  it.each(Object.keys(FILE_CONSTRAINTS.images.extensions))(
    "accepts a .%s image",
    (ext) => {
      expect(validateUpload({ name: `a.${ext}`, size: 10, type: "" }, "images").ok).toBe(true)
    }
  )

  it.each(Object.keys(FILE_CONSTRAINTS.files.extensions))(
    "accepts a .%s file",
    (ext) => {
      expect(validateUpload({ name: `a.${ext}`, size: 10, type: "" }, "files").ok).toBe(true)
    }
  )

  it("derives the stored Content-Type from the extension, not the browser", () => {
    const result = validateUpload({ name: "notes.yml", size: 10, type: "application/x-yaml" }, "files")

    expect(result).toEqual({ ok: true, extension: "yml", contentType: "text/yaml" })
  })

  it("matches extensions case-insensitively", () => {
    expect(validateUpload({ name: "PHOTO.JPG", size: 10, type: "image/jpeg" }, "images").ok).toBe(true)
  })

  it("rejects an extension the type does not allow", () => {
    const result = validateUpload({ name: "doc.pdf", size: 10, type: "application/pdf" }, "images")

    expect(result).toEqual({
      ok: false,
      error: "Unsupported file type. Allowed: PNG, JPG, JPEG, GIF, WEBP, SVG.",
    })
  })

  it("rejects a file with no extension", () => {
    expect(validateUpload({ name: "README", size: 10, type: "text/plain" }, "files").ok).toBe(false)
  })

  it.each([
    ["an HTML MIME on a .png", "a.png", "text/html", "images"],
    ["an image MIME on a .pdf", "a.pdf", "image/png", "files"],
    ["a script MIME on a .txt", "a.txt", "application/javascript", "files"],
  ] as const)("rejects %s", (_label, name, type, slug) => {
    expect(validateUpload({ name, size: 10, type }, slug)).toEqual({
      ok: false,
      error: "The file's contents don't match its extension.",
    })
  })

  it.each(["", "application/octet-stream"])(
    "lets the extension decide when the browser reports %j",
    (type) => {
      expect(validateUpload({ name: "config.toml", size: 10, type }, "files").ok).toBe(true)
    }
  )

  it("rejects an empty file", () => {
    expect(validateUpload({ name: "a.txt", size: 0, type: "text/plain" }, "files")).toEqual({
      ok: false,
      error: "The file is empty.",
    })
  })

  it.each([
    ["images", 5 * MB, "a.png"],
    ["files", 10 * MB, "a.pdf"],
  ] as const)("allows %s up to exactly the limit and rejects one byte over", (slug, limit, name) => {
    expect(validateUpload({ name, size: limit, type: "" }, slug).ok).toBe(true)
    expect(validateUpload({ name, size: limit + 1, type: "" }, slug)).toEqual({
      ok: false,
      error: `File is too large. The limit is ${limit / MB} MB.`,
    })
  })
})

describe("sanitizeFileName", () => {
  it.each([
    ["C:\\Users\\me\\report.pdf", "report.pdf"],
    ["../../etc/passwd.txt", "passwd.txt"],
    ["  spaced.md  ", "spaced.md"],
    ["bad\u0000\u001fname.txt", "badname.txt"],
    ["", "file"],
    ["/", "file"],
  ])("%j → %j", (input, expected) => {
    expect(sanitizeFileName(input)).toBe(expected)
  })

  it("keeps non-ASCII names", () => {
    expect(sanitizeFileName("résumé.pdf")).toBe("résumé.pdf")
  })

  it("caps the length at 255", () => {
    expect(sanitizeFileName(`${"a".repeat(300)}.txt`)).toHaveLength(255)
  })
})

describe("buildObjectKey / isOwnedObjectKey", () => {
  it("builds a key the same user and type then accept", () => {
    const key = buildObjectKey("user_1", "files", "pdf", UUID)

    expect(key).toBe(`user_1/files/${UUID}.pdf`)
    expect(isOwnedObjectKey(key, "user_1", "files")).toBe(true)
  })

  it("generates a fresh random id by default", () => {
    const key = buildObjectKey("user_1", "images", "png")

    expect(isOwnedObjectKey(key, "user_1", "images")).toBe(true)
    expect(key).not.toBe(buildObjectKey("user_1", "images", "png"))
  })

  it.each([
    ["another user's key", `user_2/files/${UUID}.pdf`, "user_1"],
    ["a user id that is only a prefix", `user_10/files/${UUID}.pdf`, "user_1"],
    ["the other type's prefix", `user_1/images/${UUID}.png`, "user_1"],
    ["an extension the type does not allow", `user_1/files/${UUID}.png`, "user_1"],
    ["a non-UUID name", "user_1/files/report.pdf", "user_1"],
    ["path traversal", `user_1/files/../../user_2/files/${UUID}.pdf`, "user_1"],
    ["a trailing suffix", `user_1/files/${UUID}.pdf.exe`, "user_1"],
    ["an empty user id", `/files/${UUID}.pdf`, ""],
    ["a user id containing regex syntax", `.*/files/${UUID}.pdf`, ".*"],
  ])("rejects %s", (_label, key, userId) => {
    expect(isOwnedObjectKey(key, userId, "files")).toBe(false)
  })
})

describe("contentTypeForKey", () => {
  it.each([
    [`u/images/${UUID}.svg`, "image/svg+xml"],
    [`u/images/${UUID}.jpeg`, "image/jpeg"],
    [`u/files/${UUID}.ini`, "text/plain"],
    [`u/files/${UUID}.exe`, "application/octet-stream"],
  ])("%s → %s", (key, type) => {
    expect(contentTypeForKey(key)).toBe(type)
  })
})

describe("contentDisposition", () => {
  it("shows images inline so the drawer can preview them", () => {
    expect(contentDisposition("cat.png", "image/png", false)).toMatch(/^inline;/)
  })

  it("forces an attachment for images when a download is asked for", () => {
    expect(contentDisposition("cat.png", "image/png", true)).toMatch(/^attachment;/)
  })

  it.each(["application/pdf", "text/plain", "application/octet-stream"])(
    "always downloads %s",
    (type) => {
      expect(contentDisposition("x", type, false)).toMatch(/^attachment;/)
    }
  )

  it("sends an ASCII fallback and an RFC 5987 encoded name", () => {
    expect(contentDisposition("résumé (1).pdf", "application/pdf", true)).toBe(
      `attachment; filename="r_sum_ (1).pdf"; filename*=UTF-8''r%C3%A9sum%C3%A9%20%281%29.pdf`
    )
  })

  it("cannot be broken out of with quotes or backslashes", () => {
    const header = contentDisposition('a";evil=1\\.txt', "text/plain", true)

    expect(header).toContain('filename="a_;evil=1_.txt"')
  })
})
