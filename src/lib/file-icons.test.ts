import { describe, it, expect } from "vitest"
import {
  File,
  FileBraces,
  FileCode,
  FileCog,
  FileImage,
  FileSpreadsheet,
  FileText,
} from "lucide-react"
import { fileIconFor } from "@/lib/file-icons"
import { FILE_CONSTRAINTS } from "@/lib/validation/file"

describe("fileIconFor", () => {
  it.each([
    ["spec.pdf", FileText],
    ["notes.txt", FileText],
    ["README.md", FileText],
    ["package.json", FileBraces],
    ["pom.xml", FileCode],
    ["config.yaml", FileCog],
    ["ci.yml", FileCog],
    ["Cargo.toml", FileCog],
    ["php.ini", FileCog],
    ["export.csv", FileSpreadsheet],
    ["logo.svg", FileImage],
    ["photo.jpeg", FileImage],
  ])("maps %s to its icon", (name, icon) => {
    expect(fileIconFor(name)).toBe(icon)
  })

  it("matches extensions case-insensitively", () => {
    expect(fileIconFor("REPORT.PDF")).toBe(FileText)
    expect(fileIconFor("Data.Json")).toBe(FileBraces)
  })

  it("uses the last extension of a multi-dot name", () => {
    expect(fileIconFor("backup.tar.json")).toBe(FileBraces)
    expect(fileIconFor("notes.json.txt")).toBe(FileText)
  })

  it.each([
    ["unknown extension", "archive.zip"],
    ["no extension", "Makefile"],
    ["dotfile", ".env"],
    ["trailing dot", "file."],
    ["empty name", ""],
    ["null", null],
    ["undefined", undefined],
  ])("falls back to the generic icon for %s", (_label, name) => {
    expect(fileIconFor(name)).toBe(File)
  })

  it("has a specific icon for every extension uploads accept", () => {
    const accepted = [
      ...Object.keys(FILE_CONSTRAINTS.files.extensions),
      ...Object.keys(FILE_CONSTRAINTS.images.extensions),
    ]

    for (const ext of accepted) {
      expect(fileIconFor(`x.${ext}`), ext).not.toBe(File)
    }
  })
})
