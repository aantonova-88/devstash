import Image from "next/image"
import { File } from "lucide-react"
import { cn, formatFileSize } from "@/lib/utils"

interface FilePreviewProps {
  fileName: string | null
  fileSize: number | null
  /** Image source; when null only the file row is shown. */
  imageSrc?: string | null
  imageAlt?: string
  /** `compact` for the upload field, `full` for the drawer. */
  size?: "compact" | "full"
  /** Trailing control in the file row, e.g. the upload field's Remove button. */
  action?: React.ReactNode
}

/**
 * Uploaded file card: an optional image preview above a row with the file's
 * name and size. Shared by the upload field and the drawer's read-only view.
 */
export function FilePreview({
  fileName,
  fileSize,
  imageSrc,
  imageAlt,
  size = "full",
  action,
}: FilePreviewProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/40">
      {imageSrc && (
        <div className="flex justify-center border-b border-border bg-background/40 p-3">
          {/* Either a local blob URL or the ownership-checked proxy, which the
              image optimizer cannot call with the user's session — hence
              `unoptimized`. */}
          <Image
            src={imageSrc}
            alt={imageAlt ?? fileName ?? ""}
            width={0}
            height={0}
            unoptimized
            loading="eager"
            className={cn(
              "h-auto w-auto max-w-full rounded object-contain",
              size === "compact" ? "max-h-56" : "max-h-96"
            )}
          />
        </div>
      )}
      <div className="flex items-center gap-2 px-3 py-2.5 text-sm">
        <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{fileName ?? "Untitled file"}</span>
        {fileSize != null && (
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {formatFileSize(fileSize)}
          </span>
        )}
        {action}
      </div>
    </div>
  )
}
