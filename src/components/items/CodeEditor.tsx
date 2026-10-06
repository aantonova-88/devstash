"use client"

import dynamic from "next/dynamic"
import { toast } from "sonner"
import { Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CODE_EDITOR_MAX_HEIGHT, resolveMonacoLanguage } from "@/lib/monaco"
import { cn } from "@/lib/utils"

/**
 * Monaco is ~1MB before any grammar loads, so it stays out of the initial
 * bundle: the surface is only fetched once an editor actually renders. `ssr`
 * is off because monaco needs a DOM, and because it lets the surface configure
 * monaco's loader at module scope.
 */
const CodeEditorSurface = dynamic(
  () => import("@/components/items/CodeEditorSurface").then((m) => m.CodeEditorSurface),
  {
    ssr: false,
    loading: () => (
      <span className="block p-3 font-mono text-xs text-muted-foreground">
        Loading editor…
      </span>
    ),
  },
)

/** macOS traffic lights, purely decorative. */
const WINDOW_DOTS = ["#ff5f57", "#febc2e", "#28c840"]

interface CodeEditorProps {
  value: string
  /** Free text as the user typed it; resolved to a monaco language id. */
  language?: string | null
  /** Used when `language` is empty — Command items default to shell. */
  fallbackLanguage?: string
  /** Omit `onChange` for the read-only display mode. */
  onChange?: (value: string) => void
  disabled?: boolean
  /**
   * Floor for the fluid height. Defaults to 0 so the read-only view hugs its
   * content; the forms raise it so there is room to type into a short snippet.
   */
  minHeight?: number
  /**
   * Accessible name for the editor. Monaco's input surface is a
   * `div[role="textbox"]`, which `<label for>` cannot name or focus, so the
   * surrounding `Field` renders its label without `htmlFor` and the name is
   * carried here instead.
   */
  ariaLabel?: string
  className?: string
}

/**
 * Code editor for snippet and command content, in both the read-only drawer
 * view and the create/edit forms. A macOS-style window header carries the
 * language label and a quick copy button; the editor below grows with its
 * content up to `CODE_EDITOR_MAX_HEIGHT` and then scrolls.
 */
export function CodeEditor({
  value,
  language,
  fallbackLanguage,
  onChange,
  disabled = false,
  minHeight = 0,
  ariaLabel,
  className,
}: CodeEditorProps) {
  const readOnly = onChange === undefined || disabled
  const resolved = resolveMonacoLanguage(language, fallbackLanguage)

  async function copy() {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      toast.success("Copied to clipboard")
    } catch {
      toast.error("Could not copy to clipboard")
    }
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-muted/40",
        disabled && "opacity-50",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <span aria-hidden className="flex items-center gap-1.5">
          {WINDOW_DOTS.map((color) => (
            <span
              key={color}
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
          ))}
        </span>

        <span className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-muted-foreground">
            {language?.trim() || resolved}
          </span>
          {/* type="button" — this header renders inside the item forms too. */}
          <Button type="button" variant="ghost" size="xs" onClick={copy} disabled={!value}>
            <Copy />
            Copy
          </Button>
        </span>
      </div>

      <div style={{ maxHeight: CODE_EDITOR_MAX_HEIGHT }}>
        <CodeEditorSurface
          value={value}
          language={resolved}
          readOnly={readOnly}
          minHeight={minHeight}
          onChange={onChange}
          ariaLabel={ariaLabel}
        />
      </div>
    </div>
  )
}
