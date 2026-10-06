import { describe, it, expect } from "vitest"
import {
  CODE_EDITOR_MAX_HEIGHT,
  MONACO_DARK_THEME,
  fallbackLanguageForSlug,
  resolveMonacoLanguage,
} from "@/lib/monaco"
import { LANGUAGE_SLUGS } from "@/lib/validation/item"

describe("resolveMonacoLanguage", () => {
  it("returns the fallback for empty, whitespace and nullish input", () => {
    expect(resolveMonacoLanguage(null)).toBe("plaintext")
    expect(resolveMonacoLanguage(undefined)).toBe("plaintext")
    expect(resolveMonacoLanguage("")).toBe("plaintext")
    expect(resolveMonacoLanguage("   ")).toBe("plaintext")
  })

  it("uses the supplied fallback instead of plaintext when given one", () => {
    expect(resolveMonacoLanguage(null, "shell")).toBe("shell")
    expect(resolveMonacoLanguage("  ", "shell")).toBe("shell")
  })

  it("prefers an explicit language over the fallback", () => {
    expect(resolveMonacoLanguage("python", "shell")).toBe("python")
  })

  it("lowercases and trims before matching", () => {
    expect(resolveMonacoLanguage("  TypeScript  ")).toBe("typescript")
    expect(resolveMonacoLanguage("TS")).toBe("typescript")
    expect(resolveMonacoLanguage(" Py ")).toBe("python")
  })

  it("maps the abbreviations developers actually type", () => {
    expect(resolveMonacoLanguage("ts")).toBe("typescript")
    expect(resolveMonacoLanguage("tsx")).toBe("typescript")
    expect(resolveMonacoLanguage("js")).toBe("javascript")
    expect(resolveMonacoLanguage("jsx")).toBe("javascript")
    expect(resolveMonacoLanguage("py")).toBe("python")
    expect(resolveMonacoLanguage("rb")).toBe("ruby")
    expect(resolveMonacoLanguage("rs")).toBe("rust")
    expect(resolveMonacoLanguage("yml")).toBe("yaml")
    expect(resolveMonacoLanguage("md")).toBe("markdown")
  })

  it("maps every shell spelling onto monaco's single shell id", () => {
    for (const spelling of ["sh", "bash", "zsh", "fish", "console", "terminal"]) {
      expect(resolveMonacoLanguage(spelling)).toBe("shell")
    }
  })

  it("maps spellings monaco would not otherwise recognise", () => {
    // These are the ones where a pass-through would silently lose highlighting:
    // monaco has no "c#", "golang" or "postgres" language id.
    expect(resolveMonacoLanguage("c#")).toBe("csharp")
    expect(resolveMonacoLanguage("c++")).toBe("cpp")
    expect(resolveMonacoLanguage("golang")).toBe("go")
    expect(resolveMonacoLanguage("postgres")).toBe("pgsql")
    expect(resolveMonacoLanguage("terraform")).toBe("hcl")
    expect(resolveMonacoLanguage("docker")).toBe("dockerfile")
  })

  it("passes unknown languages through rather than forcing plaintext", () => {
    // Monaco degrades to no highlighting for an id it doesn't know, so passing
    // through keeps ids we never enumerated working as monaco adds them.
    expect(resolveMonacoLanguage("zig")).toBe("zig")
    expect(resolveMonacoLanguage("Nim")).toBe("nim")
  })

  it("never returns an empty string, which monaco would reject", () => {
    for (const input of ["", "  ", null, undefined, "ts", "zig"]) {
      expect(resolveMonacoLanguage(input)).not.toBe("")
    }
  })
})

describe("fallbackLanguageForSlug", () => {
  it("assumes shell for command items, which have no language of their own", () => {
    expect(fallbackLanguageForSlug("commands")).toBe("shell")
  })

  it("leaves snippets unhighlighted rather than guessing a language", () => {
    expect(fallbackLanguageForSlug("snippets")).toBe("plaintext")
  })

  it("returns plaintext for any slug that is not a code type", () => {
    expect(fallbackLanguageForSlug("notes")).toBe("plaintext")
    expect(fallbackLanguageForSlug("links")).toBe("plaintext")
    expect(fallbackLanguageForSlug("")).toBe("plaintext")
  })

  it("covers every slug that gets the code editor", () => {
    // The editor is shown for exactly LANGUAGE_SLUGS, so each member must
    // resolve to something monaco can use.
    for (const slug of LANGUAGE_SLUGS) {
      const fallback = fallbackLanguageForSlug(slug)
      expect(fallback).toBeTruthy()
      expect(resolveMonacoLanguage(null, fallback)).toBe(fallback)
    }
  })
})

describe("MONACO_DARK_THEME", () => {
  it("inherits vs-dark so unlisted tokens still get a dark-appropriate color", () => {
    expect(MONACO_DARK_THEME.base).toBe("vs-dark")
    expect(MONACO_DARK_THEME.inherit).toBe(true)
  })

  it("keeps the editor background transparent so the surface shows through", () => {
    expect(MONACO_DARK_THEME.colors["editor.background"]).toBe("#00000000")
  })

  it("uses only hex colors, which is all monaco accepts", () => {
    // The app's own tokens are oklch; anything copied across unconverted would
    // be dropped silently by monaco rather than erroring.
    for (const [key, value] of Object.entries(MONACO_DARK_THEME.colors)) {
      expect(value, key).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/)
    }

    for (const rule of MONACO_DARK_THEME.rules) {
      if (rule.foreground) expect(rule.foreground, rule.token).toMatch(/^[0-9a-f]{6}$/)
    }
  })

  it("themes all six bracket pair colors, which otherwise inherit vs-dark's gold", () => {
    for (let i = 1; i <= 6; i++) {
      expect(MONACO_DARK_THEME.colors[`editorBracketHighlight.foreground${i}`]).toBeDefined()
    }
  })
})

describe("CODE_EDITOR_MAX_HEIGHT", () => {
  it("caps the editor at the 400px the spec asks for", () => {
    expect(CODE_EDITOR_MAX_HEIGHT).toBe(400)
  })
})
