import { DashboardShell } from "@/components/layout/DashboardShell"
import { getSystemItemTypes } from "@/lib/db/items"
import { getRecentCollections } from "@/lib/db/collections"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [itemTypes, collections] = await Promise.all([
    getSystemItemTypes(),
    getRecentCollections(),
  ])

  return (
    <DashboardShell itemTypes={itemTypes} collections={collections}>
      {children}
    </DashboardShell>
  )
}
