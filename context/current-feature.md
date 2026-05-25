# Current Feature

## Status

In Progress

## Goals

**Code Quality & Performance Quick Wins** — address low-risk issues surfaced by the code audit.

1. **Fix duplicate `getRecentCollections()` call** — currently called in both `DashboardLayout` and `DashboardPage`, causing two identical SQL queries on every dashboard load. Remove the call from `DashboardPage` and derive `totalCollections` and `favoriteCollectionsCount` from the data already fetched by the layout.

2. **Resolve `getDemoUser()` once** — `getDemoUser()` is called independently inside each of the four parallel data-fetch functions (`getPinnedItems`, `getRecentItems`, `getItemStats`, `getSystemItemTypes`), adding 4 extra DB round-trips per dashboard load. Resolve the user ID once in the layout before calling `Promise.all` and pass it as a parameter to each function.

3. **Remove unnecessary `"use client"` from `CollectionCard`** — `src/components/dashboard/CollectionCard.tsx` has the directive but uses no hooks, event handlers, or browser APIs. Removing it makes it a Server Component and reduces the client bundle.

4. **Extract `relativeTime()` to shared utils** — the function is copy-pasted verbatim in `src/app/dashboard/page.tsx`, `src/components/dashboard/ItemCard.tsx`, and `src/components/dashboard/CollectionCard.tsx`. Move it to `src/lib/utils.ts` and import from there.

5. **Extract `ICON_MAP` to shared utils** — the Lucide icon lookup object is duplicated in `src/app/dashboard/page.tsx`, `src/components/dashboard/CollectionCard.tsx`, and `src/components/layout/Sidebar.tsx`. Move to `src/lib/icons.ts`.

6. **Remove non-functional Copy button from `ItemCard`** — the button in `src/components/dashboard/ItemCard.tsx` has no `onClick` handler and renders as a dead UI element. Remove it until copy functionality is implemented.

## Notes

- Do not touch anything auth-related — NextAuth has not been implemented yet
- The demo user pattern (`getDemoUser()`) stays as-is structurally; we are only resolving it once per request instead of four times
- All changes are refactors — no new features, no schema changes, no migrations needed

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
