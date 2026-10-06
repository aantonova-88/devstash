"use client"

import { useState } from "react"
import Editor, { loader, type OnMount } from "@monaco-editor/react"
import {
  CODE_EDITOR_LINE_HEIGHT,
  CODE_EDITOR_MAX_HEIGHT,
  CODE_EDITOR_PADDING,
  MONACO_DARK_THEME,
  MONACO_THEME_NAME,
  MONACO_VS_PATH,
} from "@/lib/monaco"

/**
 * The monaco half of `CodeEditor`, split out so every monaco import sits behind
 * that file's `next/dynamic` boundary and stays out of the initial bundle.
 *
 * Module scope runs on the client only (the dynamic import is `ssr: false`),
 * which is what lets the loader be pointed at our own origin here — paths have
 * to be set before monaco starts loading, so this cannot wait for `beforeMount`.
 */
loader.config({ paths: { vs: MONACO_VS_PATH } })

interface CodeEditorSurfaceProps {
  value: string
  language: string
  readOnly: boolean
  minHeight: number
  onChange?: (value: string) => void
  ariaLabel?: string
}

export function CodeEditorSurface({
  value,
  language,
  readOnly,
  minHeight,
  onChange,
  ariaLabel,
}: CodeEditorSurfaceProps) {
  // Estimate from the line count so the box opens at roughly its final size;
  // `onMount` corrects it against monaco's real content height (which accounts
  // for wrapping) on the same frame the editor becomes visible.
  const [height, setHeight] = useState(() =>
    Math.min(
      CODE_EDITOR_MAX_HEIGHT,
      Math.max(
        minHeight,
        value.split("\n").length * CODE_EDITOR_LINE_HEIGHT + CODE_EDITOR_PADDING * 2,
      ),
    ),
  )

  const handleMount: OnMount = (editor, monaco) => {
    monaco.editor.defineTheme(MONACO_THEME_NAME, MONACO_DARK_THEME)
    monaco.editor.setTheme(MONACO_THEME_NAME)

    // Fluid height: follow monaco's own content height, clamped to the max. With
    // `scrollBeyondLastLine` off the content height is the real height of the
    // code, so short snippets render without dead space and long ones scroll.
    const syncHeight = () => {
      const next = Math.min(
        CODE_EDITOR_MAX_HEIGHT,
        Math.max(minHeight, editor.getContentHeight()),
      )
      setHeight((current) => (current === next ? current : next))
    }

    syncHeight()
    editor.onDidContentSizeChange(syncHeight)
  }

  return (
    <Editor
      value={value}
      language={language}
      height={height}
      theme={MONACO_THEME_NAME}
      onMount={handleMount}
      onChange={(next) => onChange?.(next ?? "")}
      loading={
        <span className="p-3 font-mono text-xs text-muted-foreground">
          Loading editor…
        </span>
      }
      options={{
        readOnly,
        // Keeps the hidden textarea itself read-only, not just the editor model.
        domReadOnly: readOnly,
        ariaLabel,
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        fontSize: 12,
        lineHeight: CODE_EDITOR_LINE_HEIGHT,
        padding: { top: CODE_EDITOR_PADDING, bottom: CODE_EDITOR_PADDING },
        lineNumbersMinChars: 3,
        lineDecorationsWidth: 8,
        scrollBeyondLastLine: false,
        // The drawer and the create dialog both scroll, so the editor must hand
        // the wheel back once it reaches its own end rather than trapping it.
        scrollbar: {
          alwaysConsumeMouseWheel: false,
          useShadows: false,
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
        // A snippet store, not an IDE: no suggestions, hovers or minimap.
        minimap: { enabled: false },
        hover: { enabled: "off" },
        quickSuggestions: false,
        suggestOnTriggerCharacters: false,
        parameterHints: { enabled: false },
        codeLens: false,
        contextmenu: false,
        folding: false,
        glyphMargin: false,
        stickyScroll: { enabled: false },
        overviewRulerLanes: 0,
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        occurrencesHighlight: "off",
        selectionHighlight: false,
        renderLineHighlight: readOnly ? "none" : "line",
        renderWhitespace: "selection",
        // Horizontal scrolling inside an already-scrolling panel is worse than
        // wrapping at these widths, so wrap and keep one scroll axis.
        wordWrap: "on",
        tabSize: 2,
        automaticLayout: true,
      }}
    />
  )
}
