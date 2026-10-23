"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { File, Loader2, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn, formatFileSize } from "@/lib/utils"
import {
  FILE_CONSTRAINTS,
  acceptAttribute,
  describeExtensions,
  validateUpload,
  type FileTypeSlug,
} from "@/lib/validation/file"

export interface UploadedFile {
  key: string
  fileName: string
  fileSize: number
}

interface FileUploadProps {
  slug: FileTypeSlug
  value: UploadedFile | null
  onChange: (file: UploadedFile | null) => void
  /** Lets the form block submit while bytes are still in flight. */
  onUploadingChange?: (uploading: boolean) => void
  disabled?: boolean
}

interface UploadResponse {
  key?: string
  fileName?: string
  fileSize?: number
  error?: string
}

/**
 * Drag-and-drop (or click-to-browse) upload for File and Image items.
 *
 * The file is sent to `/api/upload` as soon as it is picked, via XHR because
 * `fetch` cannot report upload progress. Limits are checked here first for
 * instant feedback; the route checks them again and is the one that counts.
 */
export function FileUpload({
  slug,
  value,
  onChange,
  onUploadingChange,
  disabled,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const xhrRef = useRef<XMLHttpRequest | null>(null)
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const isImage = slug === "images"
  const uploading = progress !== null

  // Abort an in-flight upload if the dialog closes mid-transfer.
  useEffect(() => () => xhrRef.current?.abort(), [])

  // Each object URL is released once it is replaced or the component unmounts.
  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  function setUploading(next: number | null) {
    setProgress(next)
    onUploadingChange?.(next !== null)
  }

  function startUpload(file: File) {
    setError(null)

    const check = validateUpload(file, slug)
    if (!check.ok) {
      setError(check.error)
      return
    }

    const body = new FormData()
    body.append("file", file)
    body.append("typeSlug", slug)

    const xhr = new XMLHttpRequest()
    xhrRef.current = xhr
    xhr.open("POST", "/api/upload")
    xhr.responseType = "json"

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setUploading(Math.round((event.loaded / event.total) * 100))
      }
    }

    xhr.onload = () => {
      xhrRef.current = null
      setUploading(null)
      const data = (xhr.response ?? {}) as UploadResponse

      if (xhr.status !== 200 || !data.key) {
        setError(data.error ?? "Upload failed. Please try again.")
        return
      }

      setPreviewUrl(isImage ? URL.createObjectURL(file) : null)
      onChange({
        key: data.key,
        fileName: data.fileName ?? file.name,
        fileSize: data.fileSize ?? file.size,
      })
    }

    xhr.onerror = () => {
      xhrRef.current = null
      setUploading(null)
      setError("Upload failed. Check your connection and try again.")
    }

    setUploading(0)
    xhr.send(body)
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (file) startUpload(file)
  }

  function clear() {
    setPreviewUrl(null)
    setError(null)
    onChange(null)
  }

  const inert = disabled || uploading
  const limit = formatFileSize(FILE_CONSTRAINTS[slug].maxBytes)

  if (value) {
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-muted/40">
        {previewUrl && (
          <div className="flex justify-center border-b border-border bg-background/40 p-3">
            <Image
              src={previewUrl}
              alt={value.fileName}
              width={0}
              height={0}
              unoptimized
              className="h-auto max-h-56 w-auto max-w-full rounded object-contain"
            />
          </div>
        )}
        <div className="flex items-center gap-2 px-3 py-2.5 text-sm">
          <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{value.fileName}</span>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {formatFileSize(value.fileSize)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={clear}
            disabled={disabled}
            aria-label="Remove file"
          >
            <X />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div
        role="button"
        tabIndex={inert ? -1 : 0}
        aria-disabled={inert}
        aria-label={isImage ? "Upload an image" : "Upload a file"}
        onClick={() => !inert && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (inert) return
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          if (!inert) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!inert) handleFiles(e.dataTransfer.files)
        }}
        className={cn(
          "flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-8 text-center transition-colors",
          "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          inert ? "cursor-default" : "cursor-pointer hover:bg-muted/60",
          dragging && "border-primary bg-primary/10",
          disabled && "opacity-50"
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <p className="text-sm">Uploading… {progress}%</p>
            <div
              role="progressbar"
              aria-label="Upload progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full bg-primary transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <Upload className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm">
              <span className="font-medium">Drop {isImage ? "an image" : "a file"} here</span>{" "}
              <span className="text-muted-foreground">or click to browse</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {describeExtensions(slug)} · up to {limit}
            </p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={acceptAttribute(slug)}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          // Reset so picking the same file again still fires `change`.
          e.target.value = ""
        }}
      />

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
