import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { DashboardShell } from "@/components/layout/DashboardShell"
import { getSystemItemTypes } from "@/lib/db/items"
import { getRecentCollections } from "@/lib/db/collections"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  const [itemTypes, collections] = await Promise.all([
    getSystemItemTypes(),
    getRecentCollections(),
  ])

  return (
    <DashboardShell itemTypes={itemTypes} collections={collections} user={session.user}>
      {children}
    </DashboardShell>
  )
}
