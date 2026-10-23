import { describe, it, expect, vi, beforeEach } from "vitest"

const send = vi.fn()
const S3Client = vi.fn(function () {
  return { send }
})

// Each command records its input so assertions can inspect what was sent;
// nothing ever reaches the network.
function command(name: string) {
  return vi.fn(function (this: { name: string; input: unknown }, input: unknown) {
    this.name = name
    this.input = input
  })
}

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client,
  PutObjectCommand: command("put"),
  HeadObjectCommand: command("head"),
  GetObjectCommand: command("get"),
  DeleteObjectCommand: command("delete"),
}))

const { putObject, headObject, getObjectStream, deleteObject } = await import("@/lib/r2")

beforeEach(() => {
  send.mockReset()
  vi.stubEnv("R2_ACCOUNT_ID", "acct")
  vi.stubEnv("R2_ACCESS_KEY_ID", "key")
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret")
  vi.stubEnv("R2_BUCKET_NAME", "bucket")
})

function sentInput() {
  return send.mock.calls[0][0].input
}

describe("client configuration", () => {
  it("targets the account's R2 endpoint", async () => {
    send.mockResolvedValue({})

    await deleteObject("k")

    expect(S3Client).toHaveBeenCalledWith(
      expect.objectContaining({
        region: "auto",
        endpoint: "https://acct.r2.cloudflarestorage.com",
        credentials: { accessKeyId: "key", secretAccessKey: "secret" },
      })
    )
  })

  it("fails loudly when the bucket is not configured", async () => {
    vi.stubEnv("R2_BUCKET_NAME", "")

    await expect(deleteObject("k")).rejects.toThrow("R2_BUCKET_NAME is not set")
  })
})

describe("putObject", () => {
  it("stores the bytes with the server-chosen type and an encoded original name", async () => {
    send.mockResolvedValue({})
    const body = new Uint8Array([1, 2, 3])

    await putObject("u/files/x.pdf", body, "application/pdf", "résumé.pdf")

    expect(sentInput()).toEqual({
      Bucket: "bucket",
      Key: "u/files/x.pdf",
      Body: body,
      ContentType: "application/pdf",
      ContentLength: 3,
      Metadata: { filename: "r%C3%A9sum%C3%A9.pdf" },
    })
  })
})

describe("headObject", () => {
  it("returns the stored size and decoded name", async () => {
    send.mockResolvedValue({ ContentLength: 2048, Metadata: { filename: "r%C3%A9sum%C3%A9.pdf" } })

    await expect(headObject("k")).resolves.toEqual({ size: 2048, fileName: "résumé.pdf" })
  })

  it("returns a null name when the object carries none", async () => {
    send.mockResolvedValue({ ContentLength: 5 })

    await expect(headObject("k")).resolves.toEqual({ size: 5, fileName: null })
  })

  it("returns null for a missing object", async () => {
    send.mockRejectedValue(Object.assign(new Error("nope"), { name: "NotFound" }))

    await expect(headObject("k")).resolves.toBeNull()
  })

  it("rethrows any other error", async () => {
    send.mockRejectedValue(Object.assign(new Error("denied"), { name: "AccessDenied" }))

    await expect(headObject("k")).rejects.toThrow("denied")
  })
})

describe("getObjectStream", () => {
  it("returns the body as a web stream with its length", async () => {
    const stream = new ReadableStream()
    send.mockResolvedValue({ Body: { transformToWebStream: () => stream }, ContentLength: 9 })

    await expect(getObjectStream("k")).resolves.toEqual({ body: stream, size: 9 })
  })

  it("returns null for a missing key", async () => {
    send.mockRejectedValue(Object.assign(new Error("nope"), { name: "NoSuchKey" }))

    await expect(getObjectStream("k")).resolves.toBeNull()
  })

  it("rethrows any other error", async () => {
    send.mockRejectedValue(new Error("timeout"))

    await expect(getObjectStream("k")).rejects.toThrow("timeout")
  })
})

describe("deleteObject", () => {
  it("deletes the given key from the configured bucket", async () => {
    send.mockResolvedValue({})

    await deleteObject("u/images/x.png")

    expect(sentInput()).toEqual({ Bucket: "bucket", Key: "u/images/x.png" })
  })
})
