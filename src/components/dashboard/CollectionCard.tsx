import { Star, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollectionCardProps {
  collection: {
    name: string
    isFavorite: boolean
    itemCount: number
    dominantColor: string
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

export function CollectionCard({ collection, icon: Icon }: CollectionCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3 hover:bg-card/80 transition-colors">
      <div className="flex items-start justify-between">
        <div
          className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${collection.dominantColor}25` }}
        >
          <Icon className="h-4 w-4" style={{ color: collection.dominantColor }} />
        </div>
        <Star
          className={cn(
            "h-4 w-4 shrink-0",
            collection.isFavorite
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/30"
          )}
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold">{collection.name}</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {collection.itemCount} items · updated {relativeTime(collection.updatedAt)}
        </p>
      </div>
    </div>
  )
}
