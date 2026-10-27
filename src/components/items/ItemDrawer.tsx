"use client"

import { useEffect, useState } from "react"
import { File } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ItemDrawerView } from "@/components/items/ItemDrawerView"
import { ItemEditForm } from "@/components/items/ItemEditForm"
import { ICON_MAP } from "@/lib/icons"
import type { ItemDetail } from "@/lib/db/items"

interface ItemDrawerProps {
  itemId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface LoadedDetail {
  id: string
  item?: ItemDetail
  error?: string
}

export function ItemDrawer({ itemId, open, onOpenChange }: ItemDrawerProps) {
  const [detail, setDetail] = useState<LoadedDetail | null>(null)

  useEffect(() => {
    if (!open || !itemId) return

    const controller = new AbortController()

    async function load(id: string) {
      try {
        const res = await fetch(`/api/items/${id}`, { signal: controller.signal })
        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          setDetail({ id, error: data.error ?? "Could not load this item" })
          return
        }

        setDetail({ id, item: data.item })
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        setDetail({ id, error: "Could not load this item" })
      }
    }

    load(itemId)
    return () => controller.abort()
  }, [open, itemId])

  // Keying the loaded detail by id means a drawer opened on another item shows
  // the skeleton rather than briefly flashing the previous item's content.
  const current = detail?.id === itemId ? detail : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 p-0 data-[side=right]:w-full sm:max-w-2xl!">
        {current?.error ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <p className="text-sm text-muted-foreground">{current.error}</p>
          </div>
        ) : current?.item ? (
          <ItemDrawerBody
            key={current.item.id}
            item={current.item}
            onSaved={(item) => setDetail({ id: item.id, item })}
            onDeleted={() => onOpenChange(false)}
          />
        ) : (
          <ItemDrawerSkeleton />
        )}
      </SheetContent>
    </Sheet>
  )
}

function ItemDrawerBody({
  item,
  onSaved,
  onDeleted,
}: {
  item: ItemDetail
  onSaved: (item: ItemDetail) => void
  onDeleted: () => void
}) {
  const Icon = ICON_MAP[item.type.icon] ?? File
  const [editing, setEditing] = useState(false)

  return (
    <>
      <SheetHeader className="gap-3 border-b border-border p-6 pr-14">
        <span
          className="flex items-center gap-1.5 self-start rounded px-2 py-1 text-[10px] font-semibold tracking-wider uppercase"
          style={{ color: item.type.color, backgroundColor: `${item.type.color}20` }}
        >
          <Icon className="h-3 w-3" />
          {item.type.name}
        </span>
        <SheetTitle className="font-serif text-2xl leading-tight">
          {editing ? "Edit item" : item.title}
        </SheetTitle>
        {!editing && item.description && (
          <SheetDescription>{item.description}</SheetDescription>
        )}
      </SheetHeader>

      {editing ? (
        <ItemEditForm
          item={item}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            onSaved(updated)
            setEditing(false)
          }}
        />
      ) : (
        <ItemDrawerView
          item={item}
          onEdit={() => setEditing(true)}
          onDeleted={onDeleted}
        />
      )}
    </>
  )
}

function ItemDrawerSkeleton() {
  return (
    <div className="flex-1 animate-pulse p-6" aria-busy="true" aria-label="Loading item">
      <div className="h-5 w-20 rounded bg-muted" />
      <div className="mt-4 h-7 w-2/3 rounded bg-muted" />
      <div className="mt-3 h-4 w-1/2 rounded bg-muted" />
      <div className="mt-8 h-32 rounded-lg bg-muted" />
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  )
}
