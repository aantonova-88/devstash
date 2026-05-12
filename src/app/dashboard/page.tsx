import {
  Code,
  Sparkles,
  StickyNote,
  Terminal,
  Link as LucideLink,
  File,
  Image,
  Package,
  FolderOpen,
  Star,
  Bookmark,
  Pin,
  type LucideIcon,
} from "lucide-react"
import { mockUser, mockItemTypes, mockItems, mockCollections } from "@/lib/mock-data"
import { ItemCard } from "@/components/dashboard/ItemCard"
import { CollectionCard } from "@/components/dashboard/CollectionCard"

const ICON_MAP: Record<string, LucideIcon> = {
  Code,
  Sparkles,
  StickyNote,
  Terminal,
  Link: LucideLink,
  File,
  Image,
}

function resolveCollectionIcon(defaultTypeId: string | null | undefined): LucideIcon {
  const type = mockItemTypes.find((t) => t.id === defaultTypeId)
  if (!type) return FolderOpen
  return ICON_MAP[type.icon] ?? FolderOpen
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const firstName = mockUser.name?.split(" ")[0] ?? "there"

const totalItems = mockItemTypes.reduce((sum, t) => sum + t.count, 0)
const totalCollections = mockCollections.length
const favoriteItemsCount = mockItems.filter((i) => i.isFavorite).length
const favoriteCollectionsCount = mockCollections.filter((c) => c.isFavorite).length

const pinnedItems = mockItems.filter((i) => i.isPinned)

const recentCollections = [...mockCollections].sort(
  (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
)

const recentItems = [...mockItems]
  .sort(
    (a, b) =>
      new Date(b.lastUsedAt ?? b.updatedAt).getTime() -
      new Date(a.lastUsedAt ?? a.updatedAt).getTime()
  )
  .slice(0, 10)

const STATS = [
  { label: "Total Items", value: totalItems, icon: Package },
  { label: "Collections", value: totalCollections, icon: FolderOpen },
  { label: "Favorite Items", value: favoriteItemsCount, icon: Star },
  { label: "Favorite Collections", value: favoriteCollectionsCount, icon: Bookmark },
]

export default function DashboardPage() {
  return (
    <main className="flex-1 overflow-auto p-6 space-y-8">
        {/* Welcome */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back,{" "}
            <em className="font-serif not-italic text-muted-foreground">{firstName}</em>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your developer hub. Snippets, prompts, commands, and links — all in one place,
            instantly searchable.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Pinned */}
        {pinnedItems.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pin className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Pinned</h2>
              </div>
              <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Manage →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pinnedItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  icon={ICON_MAP[item.type.icon] ?? File}
                />
              ))}
            </div>
          </section>
        )}

        {/* Recent Collections */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Collections</h2>
            </div>
            <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              View all ({totalCollections}) →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentCollections.map((col) => (
              <CollectionCard
                key={col.id}
                collection={col}
                icon={resolveCollectionIcon(col.defaultTypeId)}
              />
            ))}
          </div>
        </section>

        {/* Recent Items */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Recent</h2>
          </div>
          <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
            {recentItems.map((item) => {
              const Icon = ICON_MAP[item.type.icon] ?? File
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                >
                  <Icon
                    className="h-4 w-4 shrink-0"
                    style={{ color: item.type.color }}
                  />
                  <span className="flex-1 text-sm truncate">{item.title}</span>
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
                    style={{
                      color: item.type.color,
                      backgroundColor: `${item.type.color}20`,
                    }}
                  >
                    {item.type.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground shrink-0 w-14 text-right">
                    {relativeTime(item.lastUsedAt ?? item.updatedAt)}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      </main>
  )
}
