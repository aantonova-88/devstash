import {
  File,
  FileBraces,
  FileCode,
  FileCog,
  FileImage,
  FileSpreadsheet,
  FileText,
  type LucideIcon,
} from "lucide-react"
import { fileExtension } from "@/lib/validation/file"

/**
 * Icon per extension for file list rows. Covers every extension the `files`
 * type accepts (see `FILE_CONSTRAINTS`) plus the image ones, so a row never
 * falls back to the generic icon for a file the app let in.
 */
const FILE_ICONS: Record<string, LucideIcon> = {
  pdf: FileText,
  txt: FileText,
  md: FileText,
  json: FileBraces,
  xml: FileCode,
  yaml: FileCog,
  yml: FileCog,
  toml: FileCog,
  ini: FileCog,
  csv: FileSpreadsheet,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  gif: FileImage,
  webp: FileImage,
  svg: FileImage,
}

/** Icon for a file name by its extension; the generic `File` when unknown. */
export function fileIconFor(fileName: string | null | undefined): LucideIcon {
  if (!fileName) return File
  return FILE_ICONS[fileExtension(fileName)] ?? File
}
