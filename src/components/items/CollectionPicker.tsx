"use client"

import { Check } from "lucide-react"
import { Label } from "@/components/ui/label"
import { useCollectionOptions } from "@/components/collections/CollectionOptions"
import { cn } from "@/lib/utils"

interface CollectionPickerProps {
  /** Prefixes the label id, so the dialog and the drawer cannot collide. */
  idPrefix: string
  value: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

/** Multi-select row of the user's collections, as toggle chips. */
export function CollectionPicker({
  idPrefix,
  value,
  onChange,
  disabled,
}: CollectionPickerProps) {
  const collections = useCollectionOptions()
  const labelId = `${idPrefix}-collections-label`

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  }

  return (
    <div className="space-y-1.5">
      <Label
        id={labelId}
        className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
      >
        Collections
      </Label>
      {collections.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No collections yet. Create one from the top bar.
        </p>
      ) : (
        <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-1.5">
          {collections.map((c) => {
            const selected = value.includes(c.id)

            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => toggle(c.id)}
                className={cn(
                  "flex max-w-full items-center gap-1 rounded border px-2 py-1 text-xs transition-colors",
                  "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  "disabled:pointer-events-none disabled:opacity-50",
                  selected
                    ? "border-primary/60 bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:bg-muted/60"
                )}
              >
                {selected && <Check className="h-3 w-3 shrink-0" />}
                <span className="truncate">{c.name}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
