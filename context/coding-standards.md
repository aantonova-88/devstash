# Coding Standards

## TypeScript

- Strict mode enabled
- No `any` types - use proper typing or `unknown`
- Define interfaces for all props, API responses, and data models
- Use type inference where obvious, explicit types where helpful

## React

- Functional components only (no class components)
- Use hooks for state and side effects
- Keep components focused - one job per component
- Extract reusable logic into custom hooks

## Next.js

- Server components by default
- Only use `'use client'` when needed (interactivity, hooks, browser APIs)
- Use Server Actions for form submissions and simple mutations
- Use API routes when you need:
  - Webhooks (Stripe, GitHub, etc.)
  - File uploads with progress tracking
  - Long-running operations
  - Specific HTTP status codes or headers
  - Endpoints for future mobile/CLI clients
  - Third-party integrations
- Otherwise, fetch data directly in server components
- Dynamic routes for item/collection pages

## Tailwind CSS v4

**CRITICAL**: We are using Tailwind CSS v4, which uses CSS-based configuration.

- **DO NOT** create `tailwind.config.ts` or `tailwind.config.js` files (those are for v3)
- All theme configuration must be done in CSS using the `@theme` directive in `src/app/globals.css`
- Use CSS custom properties for colors, spacing, etc.
- No JavaScript-based config allowed

Example v4 configuration:

```css
@import "tailwindcss";

@theme {
  --color-primary: oklch(50% 0.2 250);
}

## File Organization

- Components: `src/components/[feature]/ComponentName.tsx`
- Pages: `src/app/[route]/page.tsx`
- Server Actions: `src/actions/[feature].ts`
- Types: `src/types/[feature].ts`
- Lib/Utils: `src/lib/[utility].ts`
- Unit tests: co-located next to the source — `src/lib/[utility].test.ts`, `src/actions/[feature].test.ts`

## Naming

- Components: PascalCase (`ItemCard.tsx`)
- Files: Match component name or kebab-case
- Functions: camelCase
- Constants: SCREAMING_SNAKE_CASE
- Types/Interfaces: PascalCase (no prefix)

## Styling

- Tailwind CSS for all styling
- Use shadcn/ui components where applicable
- No inline styles
- Dark mode first, light mode as option

## Database

- Use Prisma ORM for all database operations
- Always use `prisma migrate dev` for schema changes (not `db push`)
- Run `prisma migrate status` before committing to verify migrations are in sync
- Production deployments must run `prisma migrate deploy` before the app starts

## Data Fetching

- Server components fetch directly with Prisma
- Client components use Server Actions
- Validate all inputs with Zod

## Testing

We use **Vitest** for unit tests. Config lives in `vitest.config.ts`.

**What we test**

- Server actions (`src/actions/**`)
- Utilities and helpers (`src/lib/**`)

**What we do NOT test**

- React components (`src/components/**`) — no jsdom, no Testing Library
- Pages and layouts (`src/app/**`)
- Anything requiring a real database or network call

The `include` pattern in `vitest.config.ts` is deliberately limited to `src/lib` and
`src/actions`, so a test placed elsewhere simply won't run.

**Conventions**

- Co-locate tests: `src/lib/utils.ts` → `src/lib/utils.test.ts`
- Globals are off — import explicitly: `import { describe, it, expect, vi } from "vitest"`
- Environment is `node`; mocks and env stubs reset between tests (`restoreMocks`, `unstubEnvs`)
- Stub env vars with `vi.stubEnv()`, never by assigning to `process.env` directly
- Mock the database rather than hitting Neon:

```ts
vi.mock("@/lib/prisma", () => ({ prisma: {} }))
// or, for a module that actually queries:
vi.mock("@/lib/prisma", () => ({
  prisma: { item: { findMany: vi.fn().mockResolvedValue([]) } },
}))
```

- Test behaviour and edge cases (empty input, boundaries, error paths), not implementation details

```bash
npm run test        # single run
npm run test:watch  # watch mode
```

## Error Handling

- Use try/catch in Server Actions
- Return `{ success, data, error }` pattern from actions
- Display user-friendly error messages via toast

## Code Quality

- No commented-out code unless specified
- No unused imports or variables
- Keep functions under 50 lines when possible
```
