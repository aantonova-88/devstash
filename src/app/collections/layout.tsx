import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { DashboardShell } from "@/components/layout/DashboardShell"
import { getSearchItems, getSystemItemTypes } from "@/lib/db/items"
import { getRecentCollections } from "@/lib/db/collections"

export default async function CollectionsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const [itemTypes, collections, searchItems] = await Promise.all([
    getSystemItemTypes(session.user.id),
    getRecentCollections(session.user.id),
    getSearchItems(session.user.id),
  ])

  return (
    <DashboardShell
      itemTypes={itemTypes}
      collections={collections}
      searchItems={searchItems}
      user={session.user}
    >
      {children}
    </DashboardShell>
  )
}
