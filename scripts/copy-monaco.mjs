/**
 * Copies Monaco's AMD distribution into `public/monaco/vs` so the editor is
 * served from our own origin instead of jsdelivr.
 *
 * `CodeEditor` points `@monaco-editor/react`'s loader at `/monaco/vs`, which
 * keeps per-language files lazily fetched (bundling the ESM build would pull
 * every grammar into the client bundle and needs worker plumbing on top).
 *
 * Runs from `postinstall`, so it is already in place before `next build` and
 * before Vercel's build step. `public/monaco` is generated and gitignored.
 */
import { cp, rm, stat } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const source = join(root, "node_modules", "monaco-editor", "min", "vs")
const target = join(root, "public", "monaco", "vs")

try {
  await stat(source)
} catch {
  // monaco-editor isn't installed yet (or was pruned) — nothing to copy. Don't
  // fail the install; the editor surfaces its own loading error if it's missing.
  console.warn("[copy-monaco] monaco-editor not found, skipping")
  process.exit(0)
}

await rm(target, { recursive: true, force: true })
await cp(source, target, { recursive: true })
console.log(`[copy-monaco] copied monaco-editor/min/vs -> public/monaco/vs`)
