import type { editor } from "monaco-editor"

/**
 * Monaco configuration for the code editor: the loader path, the dark theme and
 * the free-text -> language-id resolver.
 *
 * Type-only import of `monaco-editor` above — this module must stay free of
 * runtime monaco imports so it can be unit tested in Vitest's `node`
 * environment and so monaco itself stays behind the dynamic boundary in
 * `CodeEditor`.
 */

/** Where `scripts/copy-monaco.mjs` puts monaco's AMD distribution. */
export const MONACO_VS_PATH = "/monaco/vs"

export const MONACO_THEME_NAME = "devstash-dark"

/** Editor grows with its content up to this, then scrolls. */
export const CODE_EDITOR_MAX_HEIGHT = 400

/** Vertical breathing room inside the editor, included in its content height. */
export const CODE_EDITOR_PADDING = 12

export const CODE_EDITOR_LINE_HEIGHT = 20

/**
 * `Item.language` is free text the user types ("TypeScript", "ts", "bash"), but
 * monaco only highlights when handed one of its own language ids. Lowercase and
 * map the spellings developers actually write; anything unrecognised is passed
 * through, since monaco degrades to no highlighting rather than erroring and a
 * pass-through keeps ids we don't enumerate here working.
 */
const LANGUAGE_ALIASES: Record<string, string> = {
  "c#": "csharp",
  "c++": "cpp",
  "objective c": "objective-c",
  "obj-c": "objective-c",
  objc: "objective-c",
  bash: "shell",
  cjs: "javascript",
  console: "shell",
  cs: "csharp",
  docker: "dockerfile",
  dotenv: "ini",
  env: "ini",
  fish: "shell",
  gql: "graphql",
  golang: "go",
  htm: "html",
  js: "javascript",
  jsonc: "json",
  jsx: "javascript",
  kt: "kotlin",
  md: "markdown",
  mdown: "markdown",
  mjs: "javascript",
  plain: "plaintext",
  postgres: "pgsql",
  postgresql: "pgsql",
  ps1: "powershell",
  psql: "pgsql",
  py: "python",
  rb: "ruby",
  rs: "rust",
  sh: "shell",
  shellscript: "shell",
  terminal: "shell",
  terraform: "hcl",
  text: "plaintext",
  tf: "hcl",
  ts: "typescript",
  tsx: "typescript",
  txt: "plaintext",
  vue: "html",
  yml: "yaml",
  zsh: "shell",
}

export function resolveMonacoLanguage(
  language: string | null | undefined,
  fallback = "plaintext",
): string {
  const normalized = language?.trim().toLowerCase()
  if (!normalized) return fallback

  return LANGUAGE_ALIASES[normalized] ?? normalized
}

/**
 * What the editor should highlight as when a code item has no `language` set.
 * Command items are shell far more often than not; snippets could be anything,
 * so they stay unhighlighted rather than guessing wrong.
 */
const SLUG_FALLBACK_LANGUAGE: Record<string, string> = {
  commands: "shell",
}

export function fallbackLanguageForSlug(slug: string): string {
  return SLUG_FALLBACK_LANGUAGE[slug] ?? "plaintext"
}

/**
 * Dark theme built from the app's own palette rather than monaco's stock
 * `vs-dark`.
 *
 * The greys are the exact hex equivalents of the `.dark` oklch tokens in
 * `globals.css` (which are Tailwind's neutral scale: `oklch(0.269 0 0)` is
 * `#262626`, and so on) — monaco themes only accept hex, so they cannot read
 * the CSS custom properties. `editor.background` is fully transparent so the
 * surrounding Tailwind surface shows through and there is one less palette
 * value to keep in sync.
 *
 * Token colors reuse the system item type colors from `prisma/seed.ts`, so the
 * highlighting belongs to the same palette as the type badges and card borders.
 */
export const MONACO_DARK_THEME: editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "", foreground: "e5e5e5" },
    { token: "comment", foreground: "737373", fontStyle: "italic" },
    { token: "keyword", foreground: "8b5cf6" },
    { token: "keyword.operator", foreground: "a1a1a1" },
    { token: "operator", foreground: "a1a1a1" },
    { token: "string", foreground: "10b981" },
    { token: "string.escape", foreground: "34d399" },
    { token: "regexp", foreground: "34d399" },
    { token: "number", foreground: "f97316" },
    { token: "constant", foreground: "f97316" },
    { token: "type", foreground: "3b82f6" },
    { token: "type.identifier", foreground: "3b82f6" },
    { token: "key", foreground: "3b82f6" },
    { token: "attribute.name", foreground: "3b82f6" },
    { token: "attribute.value", foreground: "10b981" },
    { token: "tag", foreground: "ec4899" },
    { token: "delimiter", foreground: "a1a1a1" },
    { token: "variable", foreground: "e5e5e5" },
    { token: "variable.predefined", foreground: "ec4899" },
    { token: "function", foreground: "fde047" },
    { token: "identifier", foreground: "e5e5e5" },
    { token: "metatag", foreground: "8b5cf6" },
    { token: "annotation", foreground: "8b5cf6" },
    { token: "invalid", foreground: "ef4444" },
  ],
  colors: {
    "editor.background": "#00000000",
    "editor.foreground": "#e5e5e5",
    "editorLineNumber.foreground": "#525252",
    "editorLineNumber.activeForeground": "#a1a1a1",
    "editorCursor.foreground": "#e5e5e5",
    "editor.selectionBackground": "#404040",
    "editor.inactiveSelectionBackground": "#2626267f",
    "editor.lineHighlightBackground": "#ffffff08",
    "editor.lineHighlightBorder": "#00000000",
    "editorIndentGuide.background1": "#ffffff14",
    "editorIndentGuide.activeBackground1": "#ffffff2e",
    "editorWhitespace.foreground": "#404040",
    "editorBracketMatch.background": "#00000000",
    "editorBracketMatch.border": "#737373",
    // Bracket pair colorization is on by default and otherwise inherits
    // vs-dark's gold/purple, which reads as a foreign palette here.
    "editorBracketHighlight.foreground1": "#3b82f6",
    "editorBracketHighlight.foreground2": "#8b5cf6",
    "editorBracketHighlight.foreground3": "#10b981",
    "editorBracketHighlight.foreground4": "#f97316",
    "editorBracketHighlight.foreground5": "#ec4899",
    "editorBracketHighlight.foreground6": "#fde047",
    "editorBracketHighlight.unexpectedBracket.foreground": "#ef4444",
    "scrollbar.shadow": "#00000000",
    "scrollbarSlider.background": "#ffffff1a",
    "scrollbarSlider.hoverBackground": "#ffffff2e",
    "scrollbarSlider.activeBackground": "#ffffff47",
  },
}
