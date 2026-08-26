import { type LucideIcon } from "lucide-react"
import { relativeTime } from "@/lib/utils"

interface ItemCardProps {
  item: {
    title: string
    content?: string | null
    language?: string | null
    type: { name: string; icon: string; color: string }
    tags: { tag: { name: string } }[]
    lastUsedAt?: string | null
    updatedAt: string
  }
  icon: LucideIcon
}


export function ItemCard({ item, icon: Icon }: ItemCardProps) {
  return (
    <div
      className="rounded-lg border border-border border-l-4 bg-card p-4 flex flex-col gap-3"
      style={{ borderLeftColor: item.type.color }}
    >
      <div
        className="flex items-center gap-1.5 self-start text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded"
        style={{ color: item.type.color, backgroundColor: `${item.type.color}20` }}
      >
        <Icon className="h-3 w-3" />
        {item.type.name}
      </div>

      <h3 className="text-sm font-semibold leading-tight">{item.title}</h3>

      {item.content && (
        <pre className="text-[11px] font-mono text-muted-foreground bg-muted/50 rounded p-2 overflow-hidden line-clamp-3 whitespace-pre-wrap leading-relaxed">
          {item.content.slice(0, 180)}
        </pre>
      )}

      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {item.tags.map(({ tag }) => (
            <span
              key={tag.name}
              className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
            >
              {tag.name}
            </span>
          ))}
        </div>
        <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
          {relativeTime(item.lastUsedAt ?? item.updatedAt)}
        </span>
      </div>
    </div>
  )
}
