import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getProfileUser } from "@/lib/db/users"
import { ChangePasswordCard } from "@/components/profile/ChangePasswordCard"
import { DeleteAccountCard } from "@/components/profile/DeleteAccountCard"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const user = await getProfileUser(session.user.id)
  if (!user) redirect("/sign-in")

  return (
    <main className="flex-1 overflow-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update your security settings and manage your account.
        </p>
      </div>

      {/* Account actions */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Account</h2>
        <div className="space-y-4">
          {user.hasPassword && <ChangePasswordCard />}
          <DeleteAccountCard userEmail={user.email} />
        </div>
      </section>
    </main>
  )
}
