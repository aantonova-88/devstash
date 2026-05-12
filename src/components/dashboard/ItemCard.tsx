import { type LucideIcon, Copy } from "lucide-react"

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

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function ItemCard({ item, icon: Icon }: ItemCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
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
        <div className="flex items-center gap-2 text-muted-foreground shrink-0 ml-2">
          <button className="hover:text-foreground transition-colors">
            <Copy className="h-3.5 w-3.5" />
          </button>
          <span className="text-[11px]">
            {relativeTime(item.lastUsedAt ?? item.updatedAt)}
          </span>
        </div>
      </div>
    </div>
  )
}
