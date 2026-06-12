# DevStash — Project Overview

> **One fast, searchable, AI-enhanced hub for all your dev knowledge & resources.**

---

## Table of Contents

1. [Problem](#1-problem)
2. [Target Users](#2-target-users)
3. [Tech Stack](#3-tech-stack)
4. [Architecture Overview](#4-architecture-overview)
5. [Data Models & Prisma Schema](#5-data-models--prisma-schema)
6. [Features](#6-features)
7. [Item Types](#7-item-types)
8. [Monetization](#8-monetization)
9. [UI/UX Guidelines](#9-uiux-guidelines)
10. [Routing Structure](#10-routing-structure)
11. [AI Features](#11-ai-features)
12. [Development Notes](#12-development-notes)

---

## 1. Problem

Developers keep their essentials scattered across too many places:

| Resource | Typical Location |
|---|---|
| Code snippets | VS Code, Notion, GitHub Gists |
| AI prompts | Chat histories, random `.txt` files |
| Context files | Buried deep in project folders |
| Useful links | Browser bookmarks |
| Documentation | Random folders, Notion, Confluence |
| Terminal commands | `.bash_history`, sticky notes |
| Templates & boilerplates | GitHub Gists, local folders |

This causes **context switching**, **lost knowledge**, and **inconsistent workflows**. DevStash is the single hub that fixes this.

---

## 2. Target Users

| User Type | Primary Need |
|---|---|
| **Everyday Developer** | Fast access to snippets, prompts, commands, and links |
| **AI-first Developer** | Save and manage prompts, system messages, and AI workflows |
| **Content Creator / Educator** | Store code blocks, explanations, and course notes |
| **Full-stack Builder** | Collect patterns, boilerplates, and API examples |

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) + React 19 (App Router) |
| **Language** | TypeScript |
| **Database** | [Neon](https://neon.tech/) — serverless PostgreSQL |
| **ORM** | [Prisma 7](https://www.prisma.io/docs) |
| **Caching** | Redis _(optional, to be decided)_ |
| **File Storage** | [Cloudflare R2](https://developers.cloudflare.com/r2/) |
| **Authentication** | [NextAuth v5](https://authjs.dev/) (Email/password + GitHub OAuth) |
| **AI** | [OpenAI](https://platform.openai.com/) — `gpt-4o-mini` model |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| **Payments** | [Stripe](https://stripe.com/docs) |

> **Important:** Never use `prisma db push` or manually modify the database schema. Always create and run migrations (`prisma migrate dev` in development, `prisma migrate deploy` in production).

---

## 4. Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│                      Next.js App                       │
│                                                        │
│  ┌─────────────┐   ┌────────────────────────────────┐ │
│  │   Sidebar   │   │         Main Content           │ │
│  │─────────────│   │────────────────────────────────│ │
│  │ Item Types  │   │  Collections Grid              │ │
│  │ Collections │   │  Items Grid                    │ │
│  │ Favorites   │   │  Item Drawer (quick access)    │ │
│  └─────────────┘   └────────────────────────────────┘ │
│                                                        │
│         API Routes (/api/*)                            │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────────┐  │
│  │ Items  │  │  Auth  │  │  Files │  │  AI (Pro)  │  │
│  └────────┘  └────────┘  └────────┘  └────────────┘  │
└────────────────────────────────────────────────────────┘
         │              │              │
    ┌────▼────┐   ┌─────▼─────┐  ┌────▼──────┐
    │  Neon   │   │    R2     │  │  OpenAI   │
    │Postgres │   │  Storage  │  │   API     │
    └─────────┘   └───────────┘  └───────────┘
```

**Rendering strategy:**
- SSR pages for main views (collections, item lists)
- Dynamic client components for the item drawer, search, and AI interactions
- API routes for all mutations (create/update/delete items, file uploads, AI calls)

---

## 5. Data Models & Prisma Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Auth (extends NextAuth) ───────────────────────────

model User {
  id                    String    @id @default(cuid())
  name                  String?
  email                 String    @unique
  emailVerified         DateTime?
  image                 String?
  password              String?   // hashed, null for OAuth users

  isPro                 Boolean   @default(false)
  stripeCustomerId      String?   @unique
  stripeSubscriptionId  String?   @unique

  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  accounts              Account[]
  sessions              Session[]
  items                 Item[]
  collections           Collection[]
  itemTypes             ItemType[]  // user-created custom types
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ─── Item Types ────────────────────────────────────────

enum ContentCategory {
  TEXT  // snippet, prompt, note, command
  URL   // link
  FILE  // file, image
}

model ItemType {
  id         String          @id @default(cuid())
  name       String          // e.g. "snippet", "prompt", "link"
  slug       String          // e.g. "snippets", "prompts" — used in URLs
  icon       String          // Lucide icon name e.g. "Code", "Sparkles"
  color      String          // Hex color e.g. "#3b82f6"
  category   ContentCategory
  isSystem   Boolean         @default(false) // system types cannot be modified
  order      Int             @default(0)     // display order in sidebar

  userId     String?         // null for system types
  user       User?           @relation(fields: [userId], references: [id], onDelete: Cascade)

  items      Item[]

  createdAt  DateTime        @default(now())

  @@unique([slug, userId])   // system slugs are unique globally (userId null)
}

// ─── Items ─────────────────────────────────────────────

model Item {
  id          String   @id @default(cuid())
  title       String
  description String?

  // Content — one of these will be populated based on ItemType.category
  content     String?  @db.Text  // TEXT types
  url         String?            // URL types
  fileUrl     String?            // FILE types (Cloudflare R2 URL)
  fileName    String?            // original filename
  fileSize    Int?               // bytes

  language    String?  // e.g. "typescript", "python" — for code highlighting
  isFavorite  Boolean  @default(false)
  isPinned    Boolean  @default(false)
  lastUsedAt  DateTime?

  // AI-generated fields (Pro)
  aiSummary   String?  @db.Text
  aiTags      String[] // AI-suggested tags (stored separately from user tags)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  typeId      String
  type        ItemType @relation(fields: [typeId], references: [id])

  tags        ItemTag[]
  collections ItemCollection[]
}

// ─── Tags ──────────────────────────────────────────────

model Tag {
  id    String    @id @default(cuid())
  name  String

  items ItemTag[]

  @@unique([name])
}

model ItemTag {
  itemId String
  tagId  String

  item   Item   @relation(fields: [itemId], references: [id], onDelete: Cascade)
  tag    Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([itemId, tagId])
}

// ─── Collections ───────────────────────────────────────

model Collection {
  id            String   @id @default(cuid())
  name          String
  description   String?
  isFavorite    Boolean  @default(false)
  defaultTypeId String?  // suggested type when adding new items

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  items         ItemCollection[]
}

// ─── Join Table: Items <-> Collections ─────────────────

model ItemCollection {
  itemId       String
  collectionId String
  addedAt      DateTime @default(now())

  item         Item       @relation(fields: [itemId], references: [id], onDelete: Cascade)
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)

  @@id([itemId, collectionId])
}
```

---

## 6. Features

### Core Features (All Users)

- **Items** — Create, edit, delete items with any system type
- **Collections** — Group items; items can belong to multiple collections
- **Search** — Full-text search across title, content, tags, and type
- **Favorites** — Star items and collections for quick access
- **Pinned Items** — Pin items to always appear at the top of a list
- **Recently Used** — Track `lastUsedAt` and surface recent items
- **Markdown Editor** — Rich editing for text-type items
- **Import** — Import code directly from a file
- **Dark Mode** — Default; light mode available
- **Multi-collection assignment** — Add/remove an item from multiple collections
- **Collection membership view** — See which collections an item belongs to

### Pro Features

- **File & Image uploads** — Via Cloudflare R2
- **Custom item types** _(coming later)_
- **AI auto-tagging** — Suggest tags based on content
- **AI summaries** — Summarize long items
- **AI: Explain This Code** — Plain-English explanation of a snippet
- **AI Prompt Optimizer** — Improve and refine AI prompts
- **Export** — Download all data as JSON or ZIP

---

## 7. Item Types

These are the built-in system types. They cannot be edited or deleted.

| Type | Icon | Color | Category | Free | Pro | URL Path |
|---|---|---|---|---|---|---|
| Snippet | `Code` | `#3b82f6` | TEXT | ✅ | ✅ | `/items/snippets` |
| Prompt | `Sparkles` | `#8b5cf6` | TEXT | ✅ | ✅ | `/items/prompts` |
| Note | `StickyNote` | `#fde047` | TEXT | ✅ | ✅ | `/items/notes` |
| Command | `Terminal` | `#f97316` | TEXT | ✅ | ✅ | `/items/commands` |
| Link | `Link` | `#10b981` | URL | ✅ | ✅ | `/items/links` |
| File | `File` | `#6b7280` | FILE | ❌ | ✅ | `/items/files` |
| Image | `Image` | `#ec4899` | FILE | ❌ | ✅ | `/items/images` |

> Icons are from [Lucide React](https://lucide.dev/icons/).

---

## 8. Monetization

Payments handled via **Stripe**. During development, all users have access to Pro features.

### Plan Comparison

| Feature | Free | Pro ($8/mo or $72/yr) |
|---|---|---|
| Items | 50 total | Unlimited |
| Collections | 3 | Unlimited |
| System types (text/url) | ✅ | ✅ |
| File & Image types | ❌ | ✅ |
| File uploads | ❌ | ✅ |
| Custom types | ❌ | ✅ _(coming later)_ |
| AI auto-tagging | ❌ | ✅ |
| AI code explanation | ❌ | ✅ |
| AI prompt optimizer | ❌ | ✅ |
| AI summaries | ❌ | ✅ |
| Export (JSON / ZIP) | ❌ | ✅ |
| Priority support | ❌ | ✅ |

---

## 9. UI/UX Guidelines

### Design Principles

- **Modern, minimal, developer-focused**
- **Dark mode by default** — light mode as toggle
- Clean typography with generous whitespace
- Subtle borders and shadows
- Syntax highlighting for all code blocks
- References: [Notion](https://notion.so), [Linear](https://linear.app), [Raycast](https://raycast.com)

### Screenshots

Refer to screenshots below as a base for the dashboard UI. It does not have to be exact. Use it as a reference:

- @context/screenshots/dashboard-ui-main.png
- @context/screenshots/dashboard-ui-drawer.png


### Layout

```
┌──────────────────────────────────────────────────────┐
│  [Logo]   DevStash              [Search]  [User]      │  ← Top nav
├────────────────┬─────────────────────────────────────┤
│  ITEM TYPES    │                                      │
│  ▸ Snippets    │   📁 React Patterns   📁 AI Prompts  │
│  ▸ Prompts     │                                      │
│  ▸ Notes       │   ──────────────────────────────     │
│  ▸ Commands    │                                      │
│  ▸ Links       │   [Item Card]  [Item Card]           │
│                │   [Item Card]  [Item Card]           │
│  COLLECTIONS   │                                      │
│  ▸ React Patt. │                                      │
│  ▸ AI Prompts  │                                      │
│  ▸ Context Fil │                                      │
└────────────────┴─────────────────────────────────────┘
```

- **Sidebar** — Collapsible; becomes a drawer on mobile
- **Collections** — Color-coded cards based on majority item type
- **Items** — Color-coded cards with border matching item type color
- **Item Drawer** — Opens on click for fast read/edit without leaving context

### Micro-interactions

- Smooth transitions on sidebar collapse and drawer open/close
- Hover states on all cards
- Toast notifications for create, update, delete, copy actions
- Loading skeleton screens while fetching

### Responsive

- Desktop-first layout
- Mobile: sidebar becomes a slide-in drawer
- Item grid switches from multi-column to single-column on small screens

---

## 10. Routing Structure

```
/                          → Redirect to /dashboard
/login                     → Email/password + GitHub OAuth
/register                  → Sign up

/dashboard                 → Overview: recent items, pinned, favorites

/items                     → All items
/items/snippets            → Snippets only
/items/prompts             → Prompts only
/items/notes               → Notes only
/items/commands            → Commands only
/items/links               → Links only
/items/files               → Files only (Pro)
/items/images              → Images only (Pro)

/collections               → All collections
/collections/[id]          → Single collection view

/settings                  → Account, preferences, export
/settings/billing          → Stripe subscription management

/api/items                 → CRUD items
/api/collections           → CRUD collections
/api/upload                → File upload → Cloudflare R2
/api/ai/tag                → AI auto-tag (Pro)
/api/ai/summarize          → AI summarize (Pro)
/api/ai/explain            → AI explain code (Pro)
/api/ai/optimize-prompt    → AI prompt optimizer (Pro)
/api/export                → Export data as JSON/ZIP (Pro)
/api/webhooks/stripe       → Stripe webhook handler
```

---

## 11. AI Features

All AI features use `gpt-4o-mini` via the OpenAI API and are **Pro only**.

| Feature | Endpoint | Trigger |
|---|---|---|
| **Auto-tag** | `/api/ai/tag` | On item save, suggest relevant tags |
| **Summarize** | `/api/ai/summarize` | On demand — summarizes long text items |
| **Explain Code** | `/api/ai/explain` | On demand — plain-English explanation of a snippet |
| **Prompt Optimizer** | `/api/ai/optimize-prompt` | On demand — rewrites a prompt for better AI output |

AI-suggested tags are stored separately in `Item.aiTags` (string array) and displayed distinctly from user-created tags so users can accept or dismiss them.

---

## 12. Development Notes

### Migrations

```bash
# Create a new migration (development)
npx prisma migrate dev --name <migration-name>

# Apply migrations (production)
npx prisma migrate deploy

# Never use:
# npx prisma db push  ← DO NOT USE
```

### Free Tier Limits — Enforcement

Check limits in API route middleware before creating items or collections:

```ts
// Pseudocode
const FREE_ITEM_LIMIT = 50
const FREE_COLLECTION_LIMIT = 3

if (!user.isPro) {
  const count = await prisma.item.count({ where: { userId } })
  if (count >= FREE_ITEM_LIMIT) throw new Error('Upgrade to Pro for unlimited items')
}
```

### Pro Gate — During Development

During development, treat all users as Pro. The `isProUser` helper is planned but not yet implemented — `src/lib/features.ts` currently only exports `isEmailVerificationEnabled()`. When the gate lands, follow the same env-driven pattern:

```ts
// src/lib/features.ts
export function isProUser(user: User): boolean {
  if (process.env.NODE_ENV === 'development') return true
  return user.isPro
}
```

### File Uploads (Cloudflare R2)

1. Client requests a **presigned upload URL** from `/api/upload`
2. Client uploads directly to R2 using the presigned URL (bypasses the Next.js server)
3. Client confirms upload; server stores `fileUrl`, `fileName`, `fileSize` on the `Item`

### Environment Variables

NextAuth v5 uses the `AUTH_*` prefix (not the v4 `NEXTAUTH_*` names). `NEXTAUTH_URL` is still read as a fallback for building absolute email links.

```env
# Database
DATABASE_URL=

# Auth (NextAuth v5)
AUTH_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
NEXTAUTH_URL=        # used for verification/reset email links
AUTH_URL=            # fallback for NEXTAUTH_URL

# Email (Resend)
RESEND_API_KEY=
EMAIL_FROM=                       # e.g. "DevStash <hello@yourdomain>"
EMAIL_VERIFICATION_ENABLED=       # "true" | "false"; defaults: on in prod, off in dev

# Cloudflare R2 (planned — not yet wired)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# OpenAI (planned — not yet wired)
OPENAI_API_KEY=

# Stripe (planned — not yet wired)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_MONTHLY_PRICE_ID=
STRIPE_PRO_YEARLY_PRICE_ID=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

---

*Last updated: May 2026*
