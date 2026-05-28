# Current Feature

## Status

None

## Goals

None

## Notes

None

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
