"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface DeleteAccountCardProps {
  userEmail: string
}

export function DeleteAccountCard({ userEmail }: DeleteAccountCardProps) {
  const [open, setOpen] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function cancel() {
    setOpen(false)
    setConfirmEmail("")
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (confirmEmail.trim().toLowerCase() !== userEmail.toLowerCase()) {
      setError("Email confirmation does not match.")
      return
    }

    setLoading(true)
    const res = await fetch("/api/auth/delete-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmEmail }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? "Could not delete account. Please try again.")
      setLoading(false)
      return
    }

    await signOut({ callbackUrl: "/sign-in?deleted=1" })
  }

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            Delete account
          </h3>
          <p className="text-xs text-muted-foreground">
            Permanently delete your account and all of your items and collections. This cannot be undone.
          </p>
        </div>
        {!open && (
          <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
            Delete account
          </Button>
        )}
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="space-y-4 mt-4 pt-4 border-t border-destructive/30">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <label htmlFor="confirm-email" className="text-sm font-medium">
              Type <span className="font-mono">{userEmail}</span> to confirm
            </label>
            <Input
              id="confirm-email"
              type="text"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" variant="destructive" size="sm" disabled={loading}>
              {loading ? "Deleting…" : "Permanently delete account"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={cancel} disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
