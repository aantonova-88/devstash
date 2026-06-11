import { redirect } from "next/navigation"
import { Package, FolderOpen, Mail, Calendar, File } from "lucide-react"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getProfileStats } from "@/lib/db/items"
import { ICON_MAP } from "@/lib/icons"
import { UserAvatar } from "@/components/ui/user-avatar"
import { ChangePasswordCard } from "@/components/profile/ChangePasswordCard"
import { DeleteAccountCard } from "@/components/profile/DeleteAccountCard"

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
})

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const userId = session.user.id

  const [user, stats] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true, password: true, createdAt: true },
    }),
    getProfileStats(userId),
  ])

  if (!user) redirect("/sign-in")

  const hasPassword = user.password !== null

  return (
    <main className="flex-1 overflow-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account, view your usage, and update your security settings.
        </p>
      </div>

      {/* Identity card */}
      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <UserAvatar name={user.name} image={user.image} size={64} className="shrink-0" />
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-xl font-semibold truncate">{user.name ?? "Unnamed user"}</p>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>Joined {DATE_FMT.format(user.createdAt)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Usage stats */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Usage</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <p className="text-2xl font-bold tabular-nums">{stats.totalItems}</p>
            <p className="text-xs text-muted-foreground">Total Items</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <p className="text-2xl font-bold tabular-nums">{stats.totalCollections}</p>
            <p className="text-xs text-muted-foreground">Collections</p>
          </div>
        </div>
      </section>

      {/* Type breakdown */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Items by type</h2>
        <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
          {stats.typeBreakdown.map((type) => {
            const Icon = ICON_MAP[type.icon] ?? File
            return (
              <div
                key={type.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <Icon className="h-4 w-4 shrink-0" style={{ color: type.color }} />
                <span className="flex-1 text-sm">{type.name}</span>
                <span className="text-sm tabular-nums text-muted-foreground">{type.count}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Account actions */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Account</h2>
        <div className="space-y-4">
          {hasPassword && <ChangePasswordCard />}
          <DeleteAccountCard userEmail={user.email} />
        </div>
      </section>
    </main>
  )
}
