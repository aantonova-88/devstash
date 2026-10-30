import Link from "next/link"
import { Star, File } from "lucide-react"
import { cn, relativeTime } from "@/lib/utils"
import { ICON_MAP } from "@/lib/icons"
import { CollectionCardMenu } from "@/components/collections/CollectionCardMenu"

interface TypeIcon {
  icon: string
  color: string
  name: string
}

interface CollectionCardProps {
  collection: {
    id: string
    name: string
    description: string | null
    isFavorite: boolean
    itemCount: number
    dominantColor: string
    updatedAt: Date | string
    typeIcons?: TypeIcon[]
  }
}

/**
 * The whole card links to the collection through a stretched link — the name's
 * `<Link>` has an `after:` overlay covering the card — so the 3-dots menu can
 * sit above it as a sibling rather than an (invalid) button inside an `<a>`.
 */
export function CollectionCard({ collection }: CollectionCardProps) {
  return (
    <div
      className="relative rounded-lg border border-border border-l-4 bg-card p-4 flex flex-col gap-3 hover:bg-card/80 transition-colors has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring"
      style={{ borderLeftColor: collection.dominantColor }}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold min-w-0 truncate">
            <Link
              href={`/collections/${collection.id}`}
              className="focus-visible:outline-none after:absolute after:inset-0 after:rounded-lg"
            >
              {collection.name}
            </Link>
          </h3>
          <div className="flex shrink-0 items-center gap-1">
            <Star
              className={cn(
                "h-4 w-4",
                collection.isFavorite
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground/30"
              )}
            />
            <CollectionCardMenu collection={collection} />
          </div>
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
