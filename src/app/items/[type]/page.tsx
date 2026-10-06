import { notFound, redirect } from "next/navigation"
import { File } from "lucide-react"
import { auth } from "@/auth"
import { getItemTypeBySlug, getItemsByType, getSystemItemTypes } from "@/lib/db/items"
import { ICON_MAP } from "@/lib/icons"
import { CreateItemDialog } from "@/components/items/CreateItemDialog"
import { ItemGrid } from "@/components/items/ItemGrid"

export default async function ItemsByTypePage({
  params,
}: {
  params: Promise<{ type: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const { type: slug } = await params
  const type = await getItemTypeBySlug(slug)
  if (!type) notFound()

  // `getSystemItemTypes` is cache()-wrapped and the shell layout already called
  // it this request, so the create dialog's type list costs no extra queries.
  const [items, itemTypes] = await Promise.all([
    getItemsByType(session.user.id, type.id),
    getSystemItemTypes(session.user.id),
  ])
  const Icon = ICON_MAP[type.icon] ?? File

  return (
    <main className="flex-1 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
          style={{ color: type.color, backgroundColor: `${type.color}20` }}
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{type.name}s</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
        </div>

        {/* FILE types have no create path until uploads land, which is why the
            dialog filters them out — so this page must not offer the button. */}
        {type.category !== "FILE" && (
          <div className="ml-auto">
            <CreateItemDialog
              itemTypes={itemTypes}
              initialTypeId={type.id}
              label={`New ${type.name.toLowerCase()}`}
            />
          </div>
        )}
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 flex flex-col items-center gap-2 text-center">
          <Icon className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">No {type.name.toLowerCase()}s yet</p>
          <p className="text-sm text-muted-foreground">
            Items you save as {type.name.toLowerCase()}s will show up here.
          </p>
        </div>
      ) : (
        <ItemGrid items={items} />
      )}
    </main>
  )
}
