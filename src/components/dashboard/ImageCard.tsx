"use client"

import Image from "next/image"
import { type LucideIcon } from "lucide-react"
import { cn, relativeTime } from "@/lib/utils"

interface ImageCardProps {
  item: {
    title: string
    fileUrl: string
    type: { name: string; color: string }
    lastUsedAt?: string | null
    updatedAt: string
  }
  icon: LucideIcon
  /** Opens the item drawer. Omit to render a static, non-interactive card. */
  onSelect?: () => void
}

export function ImageCard({ item, icon: Icon, onSelect }: ImageCardProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!onSelect) return
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onSelect()
    }
  }

  return (
    <div
      className={cn(
        "group overflow-hidden rounded-lg border border-border border-l-4 bg-card flex flex-col",
        onSelect &&
          "cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      )}
      style={{ borderLeftColor: item.type.color }}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      <div className="relative aspect-video overflow-hidden bg-muted/40">
        {/* Served by the ownership-checked proxy, which the image optimizer
            cannot call with the user's session — hence `unoptimized`. */}
        <Image
          src={item.fileUrl}
          alt={item.title}
          fill
          unoptimized
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="flex items-center gap-2 p-3">
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: item.type.color }} />
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight">
          {item.title}
        </h3>
        <span className="text-[11px] text-muted-foreground shrink-0">
          {relativeTime(item.lastUsedAt ?? item.updatedAt)}
        </span>
      </div>
    </div>
  )
}
