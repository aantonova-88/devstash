"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard"
  const urlError = searchParams.get("error")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(
    urlError === "CredentialsSignin"
      ? "Invalid email or password."
      : urlError === "OAuthAccountNotLinked"
      ? "This email is already registered with a different sign-in method. Sign in with your password, then link GitHub from your profile."
      : urlError
      ? "Sign-in failed. Please try again."
      : null
  )
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (searchParams.get("verified") === "1") {
      toast.success("Email verified! You can now sign in.", { id: "verified" })
      router.replace("/sign-in", { scroll: false })
      return
    }
    if (searchParams.get("registered") === "1") {
      toast.success("Account created! Sign in to continue.", { id: "registered" })
      router.replace("/sign-in", { scroll: false })
      return
    }
    if (searchParams.get("reset") === "1") {
      toast.success("Password updated! Sign in with your new password.", { id: "reset" })
      router.replace("/sign-in", { scroll: false })
      return
    }
    if (searchParams.get("deleted") === "1") {
      toast.success("Your account has been deleted.", { id: "deleted" })
      router.replace("/sign-in", { scroll: false })
      return
    }
    const verify = searchParams.get("verify")
    if (verify === "expired") {
      toast.error("That verification link has expired. Request a new one below.", {
        id: "verify-expired",
        duration: 6000,
      })
      router.replace("/sign-in", { scroll: false })
    } else if (verify === "invalid") {
      toast.error("That verification link is invalid or already used.", {
        id: "verify-invalid",
        duration: 6000,
      })
      router.replace("/sign-in", { scroll: false })
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNeedsVerification(false)
    setResent(false)
    setLoading(true)

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      if (result.code === "email_not_verified") {
        setNeedsVerification(true)
        setError("Please verify your email before signing in.")
      } else if (result.code === "rate_limited") {
        setError("Too many sign-in attempts. Please try again in a few minutes.")
      } else {
        setError("Invalid email or password.")
      }
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  async function handleResend() {
    if (!email) {
      setError("Enter your email above first.")
      return
    }
    setResending(true)
    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null)
    setResending(false)

    if (res?.status === 429) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? "Too many attempts. Please try again later.")
      return
    }
    setResent(true)
    toast.success("If an unverified account exists for that email, we just sent a new link.")
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Logo */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
          ds
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to DevStash</h1>
        <p className="text-sm text-muted-foreground">
          Enter your credentials to access your stash
        </p>
      </div>

      {/* GitHub */}
      <a
        href="/api/auth/oauth/github"
        className={buttonVariants({ variant: "outline", className: "w-full" })}
      >
        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
        </svg>
        Continue with GitHub
      </a>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      {/* Credentials form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}
        {needsVerification && (
          <div className="rounded-md border border-border bg-muted/30 p-3 text-center text-sm space-y-2">
            <p className="text-muted-foreground">
              We sent a verification link to your email. Didn&apos;t get it?
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResend}
              disabled={resending || resent}
            >
              {resending ? "Sending…" : resent ? "Sent" : "Resend verification email"}
            </Button>
          </div>
        )}
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-foreground underline underline-offset-4 hover:text-primary">
          Register
        </Link>
      </p>
    </div>
  )
}
