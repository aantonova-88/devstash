import type { NextAuthConfig } from "next-auth"
import GitHub from "next-auth/providers/github"
import Credentials from "next-auth/providers/credentials"

export default {
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
      // Real authorize logic is in auth.ts (needs bcrypt, can't run in edge)
      authorize: () => null,
    }),
  ],
  pages: {
    signIn: "/sign-in",
  },
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const path = nextUrl.pathname
      const isProtected =
        path.startsWith("/dashboard") ||
        path.startsWith("/profile") ||
        path.startsWith("/items")

      if (isProtected) {
        return isLoggedIn
      }
      return true
    },
  },
} satisfies NextAuthConfig
