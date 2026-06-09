# Current Feature: Email Verification on Register

## Status

In Progress

## Goals

- New users registering via email/password must verify their email before they can sign in
- Send verification email via Resend on successful registration using `RESEND_API_KEY` from `.env`
- Email contains a unique, single-use verification link that expires after a reasonable window (e.g., 24 hours)
- Clicking the link verifies the user (sets `User.emailVerified`) and redirects to sign-in with a success toast
- Block sign-in for users with unverified emails; show a clear error and option to resend the verification email
- GitHub OAuth users are auto-verified (NextAuth sets `emailVerified` on first sign-in) — no behavior change there
- Handle expired/invalid/already-used tokens gracefully with user-friendly messages

## Notes

- Stack: NextAuth v5, Prisma 7 + Neon, Next.js 16 App Router
- `RESEND_API_KEY` is already present in `.env`; install `resend` package
- Use Prisma's existing `VerificationToken` model (already in schema for NextAuth) to store the token + expiry
- Verification link route: `GET /api/auth/verify-email?token=...` (or a route handler under `/verify-email`)
- Resend email: simple HTML template with brand-consistent styling; needs a sender domain/identity (use `onboarding@resend.dev` in development if no verified domain yet)
- Update `POST /api/auth/register` to generate token + send email after creating the user
- Update Credentials provider `authorize()` in `auth.ts` to reject sign-in when `emailVerified` is null
- Add a "Resend verification email" action (button on sign-in error or dedicated page)

## History

- **Initial Setup** - Next.js 16, Tailwind CSS v4, TypeScript configured (Completed)
- **Dashboard UI Phase 1** - ShadCN setup, dashboard route, dark mode, top bar with search and buttons, sidebar/main placeholders (Completed)
- **Dashboard UI Phase 2** - Collapsible sidebar with item types, Collections section (Favorites + Recent sub-groups), user avatar area, mobile drawer (Completed)
- **Dashboard UI Phase 3** - Main content area: 4 stats cards, pinned items, recent collections, 10 most recent items; pages restructured as SSR server components with client interactivity isolated (Completed)
- **Database Setup** - Prisma 7 + Neon PostgreSQL: full schema with all models, indexes, and cascade deletes; `prisma.config.ts` with driver adapter pattern; initial migration applied; system item types seeded (Completed)
- **Seed Data** - Demo user (demo@devstash.io), 7 system item types, 5 collections with 14 items total (React Patterns, AI Workflows, DevOps, Terminal Commands, Design Resources); script is idempotent (Completed)
- **Dashboard Collections** - Replaced mock collection data with real Neon DB data; created `src/lib/db/collections.ts` with `getRecentCollections()`; dashboard page made async (SSR); collection card border color derived from dominant item type; small type icons shown per collection; Collections and Favorite Collections stats use real data; card redesigned: top icon removed, description added below item count (Completed)
- **Dashboard Items** - Replaced mock item data with real Neon DB data; created `src/lib/db/items.ts` with `getPinnedItems()`, `getRecentItems()`, and `getItemStats()`; all four dashboard data fetches run in parallel via `Promise.all`; pinned section hidden when no pinned items exist; item card icon/border color derived from item type; Total Items and Favorite Items stats use real counts; user name fetched from DB; seed updated to pin two items (Completed)
- **Stats & Sidebar** - Added `getSystemItemTypes()` to `src/lib/db/items.ts` with per-user counts; sidebar now receives real item types and collections as props from async `DashboardLayout`; favorite collections show a star icon, recents show a colored circle based on dominant item type; added "View all collections" link; reordered item types to: Snippets, Prompts, Commands, Notes, Files, Images, Links; React Patterns, AI Workflows, and DevOps marked as favorites (Completed)
- **Code Quality & Performance Quick Wins** - Wrapped `getDemoUser` and `getRecentCollections` with React `cache()` to eliminate duplicate DB queries per request; removed unnecessary `"use client"` from `CollectionCard`; extracted `relativeTime()` to `src/lib/utils.ts` and `ICON_MAP` to `src/lib/icons.ts`, removing 3 duplicate definitions each; removed non-functional Copy button from `ItemCard` (Completed)
- **Auth Phase 1 - NextAuth + GitHub Provider** - Installed `next-auth@beta` and `@auth/prisma-adapter`; split auth config pattern (`auth.config.ts` for edge, `auth.ts` with PrismaAdapter); GitHub OAuth provider; `/dashboard/*` protected via `src/proxy.ts` with redirect to sign-in; `Session` type extended with `user.id`; `.nvmrc` added to pin Node 20 (required by Prisma 7) (Completed)
- **Auth Phase 2 - Email/Password Credentials** - Added Credentials provider to NextAuth split-config (`auth.config.ts` placeholder, `auth.ts` with bcrypt validation); created `POST /api/auth/register` with input validation, bcrypt hashing (cost 12), and duplicate email check; GitHub OAuth unaffected (Completed)
- **Auth Phase 3 - Auth UI** - Custom `/sign-in` page (email/password + GitHub OAuth button) and `/register` page (name, email, password, confirm); register redirects to sign-in with Sonner toast; NextAuth `pages.signIn` points to `/sign-in`; JWT/session callbacks populate `user.id`; sidebar user area replaced mock data with real session — `UserAvatar` component (GitHub image or initials fallback), user name/email, sign-out dropdown via React portal; `avatars.githubusercontent.com` added to `next.config.ts` image remotePatterns (Completed)
