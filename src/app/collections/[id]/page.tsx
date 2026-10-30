import { notFound, redirect } from "next/navigation"
import { File, FolderOpen } from "lucide-react"
import { auth } from "@/auth"
import { getCollectionById } from "@/lib/db/collections"
import { getItemsByCollection } from "@/lib/db/items"
import { countItemsByType, groupCollectionItems } from "@/lib/collection-items"
import { ICON_MAP } from "@/lib/icons"
import { ItemGrid } from "@/components/items/ItemGrid"
import { CollectionActions } from "@/components/collections/CollectionActions"

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const { id } = await params
  // Both queries are scoped to the session user, so running the item query
  // before the ownership check resolves cannot leak another user's items.
  const [collection, items] = await Promise.all([
    getCollectionById(session.user.id, id),
    getItemsByCollection(session.user.id, id),
  ])
  if (!collection) notFound()

  const { images, files, others } = groupCollectionItems(items)

  return (
    <main className="flex-1 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 bg-muted text-muted-foreground">
          <FolderOpen className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight break-words sm:truncate">
            {collection.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
          {collection.description && (
            <p className="mt-1 text-sm text-muted-foreground/80">{collection.description}</p>
          )}
          {items.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {countItemsByType(items).map(({ type, count }) => {
                const Icon = ICON_MAP[type.icon] ?? File
                return (
                  <span
                    key={type.slug}
                    className="flex items-center gap-1 text-xs text-muted-foreground"
                    title={`${count} ${type.name.toLowerCase()}${count === 1 ? "" : "s"}`}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: type.color }} />
                    {count}
                  </span>
                )
              })}
            </div>
          )}
        </div>
        <CollectionActions collection={collection} />
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 flex flex-col items-center gap-2 text-center">
          <FolderOpen className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">This collection is empty</p>
          <p className="text-sm text-muted-foreground">
            Add items to it from the new-item dialog or an item&apos;s edit form.
          </p>
        </div>
      ) : (
        <>
          {others.length > 0 && <ItemGrid items={others} />}

          {images.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Images</h2>
              <ItemGrid items={images} />
            </section>
          )}

          {files.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Files</h2>
              <ItemGrid items={files} layout="list" />
            </section>
          )}
        </>
      )}
    </main>
  )
}
