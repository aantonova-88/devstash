"use client"

import { File } from "lucide-react"
import { Label } from "@/components/ui/label"
import { ICON_MAP } from "@/lib/icons"
import { cn } from "@/lib/utils"
import type { SidebarItemType } from "@/lib/db/items"

interface TypeChipsProps {
  types: SidebarItemType[]
  value: string
  onChange: (typeId: string) => void
  disabled?: boolean
}

/** Single-choice row of item type chips for the create form. */
export function TypeChips({ types, value, onChange, disabled }: TypeChipsProps) {
  return (
    <div className="space-y-1.5">
      <Label
        id="new-item-type-label"
        className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
      >
        Type
      </Label>
      <div
        role="radiogroup"
        aria-labelledby="new-item-type-label"
        className="flex flex-wrap gap-1.5"
      >
        {types.map((t) => {
          const Icon = ICON_MAP[t.icon] ?? File
          const selected = t.id === value

          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(t.id)}
              className={cn(
                "flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] font-semibold tracking-wider uppercase transition-colors",
                "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                "disabled:pointer-events-none disabled:opacity-50",
                selected
                  ? "border-transparent"
                  : "border-border text-muted-foreground hover:bg-muted/60"
              )}
              style={
                selected
                  ? { color: t.color, backgroundColor: `${t.color}20` }
                  : undefined
              }
            >
              <Icon className="h-3 w-3" />
              {t.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
