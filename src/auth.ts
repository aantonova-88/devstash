import NextAuth, { CredentialsSignin } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GitHub from "next-auth/providers/github"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { emailMatch, normalizeEmail } from "@/lib/email-address"
import { isEmailVerificationEnabled } from "@/lib/features"
import { checkRateLimit, getClientIp, loginLimiter } from "@/lib/rate-limit"
import authConfig from "./auth.config"

class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified"
}

class RateLimitedError extends CredentialsSignin {
  code = "rate_limited"
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  ...authConfig,
  providers: [
    GitHub({
      allowDangerousEmailAccountLinking: true,
      authorization: { params: { prompt: "consent" } },
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials, request) => {
        const { email, password } = credentials as {
          email?: unknown
          password?: unknown
        }
        if (typeof email !== "string" || typeof password !== "string") return null
        if (!email.trim() || !password) return null

        const ip = getClientIp(request)
        const limit = await checkRateLimit(loginLimiter, `${ip}:${normalizeEmail(email)}`)
        if (!limit.success) throw new RateLimitedError()

        const user = await prisma.user.findFirst({ where: emailMatch(email) })
        if (!user?.password) return null

        const valid = await bcrypt.compare(password, user.password)
        if (!valid) return null

        if (!user.emailVerified && isEmailVerificationEnabled()) {
          throw new EmailNotVerifiedError()
        }

        return { id: user.id, name: user.name, email: user.email, image: user.image }
      },
    }),
  ],
})
