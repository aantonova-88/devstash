"use client"

import { useId, useState } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { toast } from "sonner"
import { Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CODE_EDITOR_MAX_HEIGHT } from "@/lib/monaco"
import { cn } from "@/lib/utils"

type Tab = "write" | "preview"

const TABS: { id: Tab; label: string }[] = [
  { id: "write", label: "Write" },
  { id: "preview", label: "Preview" },
]

/**
 * Content is user-supplied, so links open in a new tab without an opener.
 * Raw HTML stays disabled (no `rehype-raw`), and react-markdown's default
 * `urlTransform` already drops `javascript:` and other unsafe schemes.
 */
const MARKDOWN_COMPONENTS: Components = {
  a: ({ href, title, children }) => (
    <a href={href} title={title} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
}

interface MarkdownEditorProps {
  value: string
  /** Omit `onChange` for the read-only display mode, which shows Preview only. */
  onChange?: (value: string) => void
  disabled?: boolean
  /** Applied to the Write textarea so the surrounding `Field` label targets it. */
  id?: string
  /** Floor for the fluid height, so a short note still leaves room to type. */
  minHeight?: number
  /** Accessible name for the preview region in read-only mode. */
  ariaLabel?: string
  className?: string
}

/**
 * Markdown editor for note and prompt content, in both the read-only drawer
 * view and the create/edit forms. Same window chrome as `CodeEditor` so the
 * two read as one family; the body grows with its content up to
 * `CODE_EDITOR_MAX_HEIGHT` and then scrolls.
 */
export function MarkdownEditor({
  value,
  onChange,
  disabled = false,
  id,
  minHeight = 0,
  ariaLabel,
  className,
}: MarkdownEditorProps) {
  const readOnly = onChange === undefined
  const [tab, setTab] = useState<Tab>(readOnly ? "preview" : "write")
  const panelId = useId()
  const visibleTabs = readOnly ? TABS.filter((t) => t.id === "preview") : TABS

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
        "overflow-hidden rounded-lg border border-border bg-muted/40 transition-colors",
        !readOnly && "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        disabled && "opacity-50",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-2 py-1.5">
        <div role="tablist" aria-label="Content mode" className="flex items-center gap-1">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`${panelId}-${t.id}-tab`}
              aria-selected={tab === t.id}
              aria-controls={panelId}
              onClick={() => setTab(t.id)}
              disabled={disabled}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                tab === t.id
                  ? "bg-background/60 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <span className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-muted-foreground">markdown</span>
          {/* type="button" — this header renders inside the item forms too. */}
          <Button type="button" variant="ghost" size="xs" onClick={copy} disabled={!value}>
            <Copy />
            Copy
          </Button>
        </span>
      </div>

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={`${panelId}-${tab}-tab`}
        className="overflow-auto"
        style={{ maxHeight: CODE_EDITOR_MAX_HEIGHT }}
      >
        {tab === "write" && !readOnly ? (
          <textarea
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="Write in Markdown…"
            className="block field-sizing-content w-full resize-none bg-transparent px-3 py-3 font-mono text-xs leading-relaxed outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            style={{ minHeight, maxHeight: CODE_EDITOR_MAX_HEIGHT }}
          />
        ) : (
          <div style={{ minHeight }} aria-label={readOnly ? ariaLabel : undefined}>
            {value.trim() ? (
              <div className="markdown-preview px-4 py-3">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                  {value}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="px-4 py-3 text-xs text-muted-foreground">Nothing to preview.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
