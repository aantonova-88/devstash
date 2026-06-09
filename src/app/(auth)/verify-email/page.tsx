import Link from "next/link"
import { Mail } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

export default function VerifyEmailPage() {
  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-center space-y-5">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Mail className="h-6 w-6 text-foreground" />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          We&apos;ve sent you a verification link. Please check your inbox.
        </p>
      </div>
      <Link href="/sign-in" className={buttonVariants({ className: "w-full" })}>
        Back to sign in
      </Link>
    </div>
  )
}
