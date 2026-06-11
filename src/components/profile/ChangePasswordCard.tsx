"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ChangePasswordCard() {
  const [open, setOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function reset() {
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setError(null)
  }

  function cancel() {
    setOpen(false)
    reset()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.")
      return
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.")
      return
    }

    setLoading(true)
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    })
    setLoading(false)

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(data.error ?? "Could not update password. Please try again.")
      return
    }

    toast.success("Password updated.")
    setOpen(false)
    reset()
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Password</h3>
          <p className="text-xs text-muted-foreground">
            Change the password you use to sign in.
          </p>
        </div>
        {!open && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            Change password
          </Button>
        )}
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="space-y-4 mt-4 pt-4 border-t border-border">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <label htmlFor="current-password" className="text-sm font-medium">
              Current password
            </label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="new-password" className="text-sm font-medium">
              New password
            </label>
            <Input
              id="new-password"
              type="password"
              placeholder="Min. 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirm-new-password" className="text-sm font-medium">
              Confirm new password
            </label>
            <Input
              id="confirm-new-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Updating…" : "Update password"}
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
