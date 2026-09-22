# Unit Testing Setup (Vitest)

## Goal

Add a unit test runner to DevStash for **server actions and utilities only**. Components,
pages, and end-to-end flows are explicitly out of scope.

## Scope

**In scope**

- `src/lib/**` — pure utilities and helpers (`utils.ts`, `features.ts`, `rate-limit.ts`,
  `verification.ts`, `password-reset.ts`, …)
- `src/actions/**` — server actions (none exist yet; the config is ready for them)

**Out of scope**

- React components (`src/components/**`) — no jsdom, no Testing Library, no React plugin
- Pages / layouts (`src/app/**`)
- API route handlers (covered by manual browser testing for now)
- Browser/E2E testing (Playwright MCP is used manually)
- Real database access — Prisma is mocked; tests never touch Neon

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Runner | Vitest | Native ESM + TS, fast, same config language as the rest of the stack |
| Environment | `node` | Nothing under test touches the DOM |
| Globals | Off | Explicit `import { describe, it, expect } from "vitest"` keeps `tsconfig.json` untouched |
| Test location | Co-located `*.test.ts` next to the source file | Easy to find, obvious when a util has no test |
| Path alias | `@/*` → `src/*` resolved in `vitest.config.ts` | Mirrors `tsconfig.json` without an extra dependency |
| Database | `vi.mock("@/lib/prisma")` | Keeps tests hermetic and offline |

## Deliverables

1. `vitest` as a devDependency
2. `vitest.config.ts` — node environment, `@/*` alias, `include` limited to `src/lib` and `src/actions`
3. `npm run test` (single run) and `npm run test:watch` scripts
4. Initial test suites covering the existing pure utilities:
   - `src/lib/utils.test.ts` — `cn`, `relativeTime`
   - `src/lib/features.test.ts` — `isEmailVerificationEnabled`
   - `src/lib/rate-limit.test.ts` — `getClientIp`, `formatRetryAfter`, `checkRateLimit` (fail-open), `tooManyRequestsResponse`
   - `src/lib/verification.test.ts` — `getBaseUrl` (demonstrates the Prisma-mock pattern)
5. Documentation updates: `CLAUDE.md` commands, `context/coding-standards.md` testing section,
   `context/ai-interaction.md` workflow step 4, `context/project-overview.md` tech stack

## Acceptance

- `npm run test` passes
- `npm run build` still passes (test files type-check cleanly)
- `npm run lint` clean
