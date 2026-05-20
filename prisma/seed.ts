import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ContentCategory } from "../src/generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const systemTypes = [
  { name: "Snippet", slug: "snippets", icon: "Code",       color: "#3b82f6", category: ContentCategory.TEXT, order: 0 },
  { name: "Prompt",  slug: "prompts",  icon: "Sparkles",   color: "#8b5cf6", category: ContentCategory.TEXT, order: 1 },
  { name: "Command", slug: "commands", icon: "Terminal",   color: "#f97316", category: ContentCategory.TEXT, order: 2 },
  { name: "Note",    slug: "notes",    icon: "StickyNote", color: "#fde047", category: ContentCategory.TEXT, order: 3 },
  { name: "File",    slug: "files",    icon: "File",       color: "#6b7280", category: ContentCategory.FILE, order: 4 },
  { name: "Image",   slug: "images",   icon: "Image",      color: "#ec4899", category: ContentCategory.FILE, order: 5 },
  { name: "Link",    slug: "links",    icon: "Link",       color: "#10b981", category: ContentCategory.URL,  order: 6 },
];

async function main() {
  // ── System item types ──────────────────────────────────────────────────────
  console.log("Seeding system item types...");
  const typeMap: Record<string, string> = {};
  for (const type of systemTypes) {
    const existing = await prisma.itemType.findFirst({ where: { slug: type.slug, userId: null } });
    const record = existing ?? await prisma.itemType.create({ data: { ...type, isSystem: true, userId: null } });
    typeMap[type.slug] = record.id;
    console.log(`  ✓ ${type.name}`);
  }

  // ── Demo user ──────────────────────────────────────────────────────────────
  console.log("Creating demo user...");
  const passwordHash = await bcrypt.hash("12345678", 12);
  let user = await prisma.user.findFirst({ where: { email: "demo@devstash.io" } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "demo@devstash.io",
        name: "Demo User",
        password: passwordHash,
        isPro: false,
        emailVerified: new Date(),
      },
    });
  }
  console.log("  ✓ demo@devstash.io");

  // Clear existing demo items/collections so the script is idempotent
  await prisma.item.deleteMany({ where: { userId: user.id } });
  await prisma.collection.deleteMany({ where: { userId: user.id } });

  // ── Collections & items ────────────────────────────────────────────────────
  console.log("Creating collections and items...");

  // React Patterns — 3 snippets
  const reactPatterns = await prisma.collection.create({
    data: { name: "React Patterns", description: "Reusable React patterns and hooks", isFavorite: true, userId: user.id },
  });
  const reactItems = await Promise.all([
    prisma.item.create({ data: {
      title: "useDebounce & useLocalStorage hooks",
      description: "Custom hooks for debouncing values and persisting state to localStorage",
      language: "typescript",
      isPinned: true,
      userId: user.id,
      typeId: typeMap.snippets,
      content: `import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    const valueToStore = value instanceof Function ? value(storedValue) : value;
    setStoredValue(valueToStore);
    window.localStorage.setItem(key, JSON.stringify(valueToStore));
  };

  return [storedValue, setValue] as const;
}`,
    }}),
    prisma.item.create({ data: {
      title: "Context Provider pattern",
      description: "Compound component and context provider boilerplate",
      language: "typescript",
      userId: user.id,
      typeId: typeMap.snippets,
      content: `import { createContext, useContext, useState, type ReactNode } from "react";

interface ThemeContextValue {
  theme: "light" | "dark";
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}`,
    }}),
    prisma.item.create({ data: {
      title: "Utility functions",
      description: "cn, formatDate, truncate, slugify — common project utilities",
      language: "typescript",
      userId: user.id,
      typeId: typeMap.snippets,
      content: `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }).format(new Date(date));
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength).trimEnd() + "…";
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}`,
    }}),
  ]);
  await prisma.itemCollection.createMany({
    data: reactItems.map((item) => ({ itemId: item.id, collectionId: reactPatterns.id })),
  });
  console.log("  ✓ React Patterns (3 snippets)");

  // AI Workflows — 3 prompts
  const aiWorkflows = await prisma.collection.create({
    data: { name: "AI Workflows", description: "AI prompts and workflow automations", isFavorite: true, userId: user.id },
  });
  const aiItems = await Promise.all([
    prisma.item.create({ data: {
      title: "Code Review Prompt",
      description: "Structured code review with prioritised feedback",
      isPinned: true,
      userId: user.id,
      typeId: typeMap.prompts,
      content: `Review the following code and provide structured feedback.

**Focus areas:**
1. **Correctness** — Logic errors, edge cases, off-by-one errors
2. **Security** — Input validation, injection risks, exposed secrets
3. **Performance** — N+1 queries, unnecessary re-renders, memory leaks
4. **Readability** — Naming, function length, abstraction level
5. **Best practices** — Idiomatic patterns for the language/framework

Format your response as:
- 🔴 Critical (must fix)
- 🟡 Warning (should fix)
- 🟢 Suggestion (nice to have)

Code to review:
\`\`\`
[PASTE CODE HERE]
\`\`\``,
    }}),
    prisma.item.create({ data: {
      title: "Documentation Generator",
      description: "Generate clear, concise docs for any function or module",
      userId: user.id,
      typeId: typeMap.prompts,
      content: `Generate documentation for the following code. Include:

1. **Summary** — One sentence describing what it does
2. **Parameters** — Name, type, and description for each param
3. **Returns** — Type and description of the return value
4. **Example** — A realistic usage example
5. **Notes** — Gotchas, side effects, or important caveats

Keep the tone technical but clear. Do not restate what the code obviously does.

Code:
\`\`\`
[PASTE CODE HERE]
\`\`\``,
    }}),
    prisma.item.create({ data: {
      title: "Refactoring Assistant",
      description: "Improve code quality without changing behaviour",
      userId: user.id,
      typeId: typeMap.prompts,
      content: `Refactor the following code to improve quality. Rules:

- **Do not change behaviour** — functionality must remain identical
- **Reduce complexity** — simplify conditionals, remove duplication
- **Improve naming** — variables, functions, and types should be self-documenting
- **Apply SOLID principles** where practical
- **Prefer composition over inheritance**

After the refactored code, briefly explain (bullet points) what you changed and why.

Original code:
\`\`\`
[PASTE CODE HERE]
\`\`\``,
    }}),
  ]);
  await prisma.itemCollection.createMany({
    data: aiItems.map((item) => ({ itemId: item.id, collectionId: aiWorkflows.id })),
  });
  console.log("  ✓ AI Workflows (3 prompts)");

  // DevOps — 1 snippet, 1 command, 2 links
  const devops = await prisma.collection.create({
    data: { name: "DevOps", description: "Infrastructure and deployment resources", isFavorite: true, userId: user.id },
  });
  const devopsItems = await Promise.all([
    prisma.item.create({ data: {
      title: "Dockerfile — Node.js multi-stage",
      description: "Production multi-stage Dockerfile for a Next.js app",
      language: "dockerfile",
      userId: user.id,
      typeId: typeMap.snippets,
      content: `FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]`,
    }}),
    prisma.item.create({ data: {
      title: "Deploy to production",
      description: "Pull, migrate, build, reload — zero-downtime deploy sequence",
      userId: user.id,
      typeId: typeMap.commands,
      content: `git pull origin main && npm ci && npx prisma migrate deploy && npm run build && pm2 reload app`,
    }}),
    prisma.item.create({ data: {
      title: "Docker Documentation",
      url: "https://docs.docker.com/",
      userId: user.id,
      typeId: typeMap.links,
    }}),
    prisma.item.create({ data: {
      title: "GitHub Actions Docs",
      url: "https://docs.github.com/en/actions",
      userId: user.id,
      typeId: typeMap.links,
    }}),
  ]);
  await prisma.itemCollection.createMany({
    data: devopsItems.map((item) => ({ itemId: item.id, collectionId: devops.id })),
  });
  console.log("  ✓ DevOps (1 snippet, 1 command, 2 links)");

  // Terminal Commands — 4 commands
  const terminal = await prisma.collection.create({
    data: { name: "Terminal Commands", description: "Useful shell commands for everyday development", userId: user.id },
  });
  const terminalItems = await Promise.all([
    prisma.item.create({ data: {
      title: "Git — undo & clean",
      description: "Undo last commit, unstage files, discard changes, clean untracked",
      userId: user.id,
      typeId: typeMap.commands,
      content: `# Undo last commit (keep changes staged)
git reset --soft HEAD~1

# Unstage all files
git reset HEAD

# Discard all local changes
git checkout -- .

# Remove untracked files and directories
git clean -fd

# Interactive rebase last 3 commits
git rebase -i HEAD~3`,
    }}),
    prisma.item.create({ data: {
      title: "Docker — housekeeping",
      description: "Stop containers, remove images, prune volumes",
      userId: user.id,
      typeId: typeMap.commands,
      content: `# Stop all running containers
docker stop $(docker ps -q)

# Remove all stopped containers
docker rm $(docker ps -aq)

# Remove all unused images
docker image prune -a

# Remove all unused volumes
docker volume prune

# Nuclear option — remove everything unused
docker system prune -a --volumes`,
    }}),
    prisma.item.create({ data: {
      title: "Find & kill process on port",
      description: "Identify and kill whatever is occupying a given port",
      userId: user.id,
      typeId: typeMap.commands,
      content: `# Find process on port 3000 (macOS / Linux)
lsof -i :3000

# Kill it
kill -9 $(lsof -t -i:3000)

# Windows equivalent
netstat -ano | findstr :3000
taskkill /PID <PID> /F`,
    }}),
    prisma.item.create({ data: {
      title: "npm — audit & clean install",
      description: "Audit dependencies and perform a clean reinstall",
      userId: user.id,
      typeId: typeMap.commands,
      content: `# Audit for vulnerabilities
npm audit

# Auto-fix safe issues
npm audit fix

# Remove node_modules and reinstall from lockfile
rm -rf node_modules && npm ci

# Check for outdated packages
npm outdated

# Update all packages to latest allowed by semver
npm update`,
    }}),
  ]);
  await prisma.itemCollection.createMany({
    data: terminalItems.map((item) => ({ itemId: item.id, collectionId: terminal.id })),
  });
  console.log("  ✓ Terminal Commands (4 commands)");

  // Design Resources — 4 links
  const design = await prisma.collection.create({
    data: { name: "Design Resources", description: "UI/UX resources and references", userId: user.id },
  });
  const designItems = await Promise.all([
    prisma.item.create({ data: {
      title: "Tailwind CSS Docs",
      url: "https://tailwindcss.com/docs",
      userId: user.id,
      typeId: typeMap.links,
    }}),
    prisma.item.create({ data: {
      title: "shadcn/ui Components",
      url: "https://ui.shadcn.com/",
      userId: user.id,
      typeId: typeMap.links,
    }}),
    prisma.item.create({ data: {
      title: "Radix UI Primitives",
      url: "https://www.radix-ui.com/primitives",
      userId: user.id,
      typeId: typeMap.links,
    }}),
    prisma.item.create({ data: {
      title: "Lucide Icons",
      url: "https://lucide.dev/icons/",
      userId: user.id,
      typeId: typeMap.links,
    }}),
  ]);
  await prisma.itemCollection.createMany({
    data: designItems.map((item) => ({ itemId: item.id, collectionId: design.id })),
  });
  console.log("  ✓ Design Resources (4 links)");

  console.log("\nSeeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
