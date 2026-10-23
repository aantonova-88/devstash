import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"

/**
 * Cloudflare R2 access through its S3-compatible API. Objects are private: they
 * are only ever read back through `/api/items/[id]/file`, which checks the
 * session owns the item first.
 */

let client: S3Client | null = null

function getBucket(): string {
  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket) throw new Error("R2_BUCKET_NAME is not set")
  return bucket
}

function getClient(): S3Client {
  if (client) return client

  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials are not configured")
  }

  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    // The SDK's default flexible checksums are not something R2 needs; only
    // send them when an operation requires one.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  })
  return client
}

/** Original filename travels as object metadata so the server — not the client — supplies it at create time. */
const FILE_NAME_METADATA = "filename"

export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string,
  fileName: string
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: body.byteLength,
      // Metadata goes out as an HTTP header, so non-ASCII names are encoded.
      Metadata: { [FILE_NAME_METADATA]: encodeURIComponent(fileName) },
    })
  )
}

export interface StoredObjectInfo {
  size: number
  fileName: string | null
}

/** Size and original name of an object, or null when it does not exist. */
export async function headObject(key: string): Promise<StoredObjectInfo | null> {
  try {
    const res = await getClient().send(
      new HeadObjectCommand({ Bucket: getBucket(), Key: key })
    )
    const encoded = res.Metadata?.[FILE_NAME_METADATA]
    return {
      size: res.ContentLength ?? 0,
      fileName: encoded ? decodeURIComponent(encoded) : null,
    }
  } catch (err) {
    if ((err as { name?: string }).name === "NotFound") return null
    throw err
  }
}

export interface ObjectStream {
  body: ReadableStream
  size: number | undefined
}

/** The object's bytes as a web stream, or null when it does not exist. */
export async function getObjectStream(key: string): Promise<ObjectStream | null> {
  try {
    const res = await getClient().send(
      new GetObjectCommand({ Bucket: getBucket(), Key: key })
    )
    if (!res.Body) return null
    return { body: res.Body.transformToWebStream(), size: res.ContentLength }
  } catch (err) {
    if ((err as { name?: string }).name === "NoSuchKey") return null
    throw err
  }
}

/** Deleting a missing key succeeds in S3/R2, so this is safe to retry. */
export async function deleteObject(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }))
}
