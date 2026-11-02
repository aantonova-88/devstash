import { redirect } from "next/navigation"
import { FolderOpen } from "lucide-react"
import { auth } from "@/auth"
import { getCollectionStats, getCollectionsPage } from "@/lib/db/collections"
import {
  COLLECTIONS_PER_PAGE,
  pageHref,
  pageWindow,
  parsePage,
  totalPages,
} from "@/lib/pagination"
import { CollectionCard } from "@/components/dashboard/CollectionCard"
import { Pagination } from "@/components/layout/Pagination"

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const page = parsePage((await searchParams).page)
  const [collections, { totalCollections: total }] = await Promise.all([
    getCollectionsPage(session.user.id, pageWindow(page, COLLECTIONS_PER_PAGE)),
    getCollectionStats(session.user.id),
  ])
  const pages = totalPages(total, COLLECTIONS_PER_PAGE)
  if (page > pages) redirect(pageHref("/collections", pages))

  return (
    <main className="flex-1 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 bg-muted text-muted-foreground">
          <FolderOpen className="h-4.5 w-4.5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Collections</h1>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "collection" : "collections"}
          </p>
        </div>
      </div>

      {/* Collections */}
      {collections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 flex flex-col items-center gap-2 text-center">
          <FolderOpen className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">No collections yet</p>
          <p className="text-sm text-muted-foreground">
            Create a collection to group related items together.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((col) => (
              <CollectionCard key={col.id} collection={col} />
            ))}
          </div>
          <Pagination basePath="/collections" page={page} totalPages={pages} />
        </>
      )}
    </main>
  )
}
