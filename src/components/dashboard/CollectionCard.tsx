import { Star, File } from "lucide-react"
import { cn, relativeTime } from "@/lib/utils"
import { ICON_MAP } from "@/lib/icons"

interface TypeIcon {
  icon: string
  color: string
  name: string
}

interface CollectionCardProps {
  collection: {
    name: string
    description: string | null
    isFavorite: boolean
    itemCount: number
    dominantColor: string
    updatedAt: Date | string
    typeIcons?: TypeIcon[]
  }
}


export function CollectionCard({ collection }: CollectionCardProps) {
  return (
    <div
      className="rounded-lg border bg-card p-4 flex flex-col gap-3 hover:bg-card/80 transition-colors"
      style={{ borderColor: `${collection.dominantColor}50` }}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{collection.name}</h3>
          <Star
            className={cn(
              "h-4 w-4 shrink-0",
              collection.isFavorite
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            )}
          />
        </div>
        {collection.typeIcons && collection.typeIcons.length > 0 && (
          <div className="flex items-center gap-1">
            {collection.typeIcons.map(({ icon, color, name }) => {
              const TypeIcon = ICON_MAP[icon] ?? File
              return (
                <div
                  key={name}
                  className="h-5 w-5 rounded flex items-center justify-center"
                  style={{ backgroundColor: `${color}20` }}
                  title={name}
                >
                  <TypeIcon className="h-3 w-3" style={{ color }} />
                </div>
              )
            })}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          {collection.itemCount} items · updated {relativeTime(collection.updatedAt)}
        </p>
        {collection.description && (
          <p className="text-[11px] text-muted-foreground/70 line-clamp-2">
            {collection.description}
          </p>
        )}
      </div>
    </div>
  )
}
