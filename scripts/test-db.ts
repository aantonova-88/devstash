import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // ── Connection ─────────────────────────────────────────────────────────────
  await prisma.$queryRaw`SELECT 1`;
  console.log("✓ Connected to Neon PostgreSQL\n");

  // ── System item types ──────────────────────────────────────────────────────
  const itemTypes = await prisma.itemType.findMany({
    where: { isSystem: true },
    orderBy: { order: "asc" },
  });
  console.log(`Item types (${itemTypes.length}):`);
  for (const t of itemTypes) {
    console.log(`  ${t.icon.padEnd(12)} ${t.name.padEnd(10)} ${t.color}  ${t.category}`);
  }

  // ── Demo user ──────────────────────────────────────────────────────────────
  const user = await prisma.user.findFirst({
    where: { email: "demo@devstash.io" },
    include: {
      _count: { select: { items: true, collections: true } },
    },
  });
  if (!user) throw new Error("Demo user not found — run npm run db:seed first");
  console.log(`\nDemo user: ${user.name} <${user.email}>`);
  console.log(`  isPro: ${user.isPro}  |  items: ${user._count.items}  |  collections: ${user._count.collections}`);

  // ── Collections with items ─────────────────────────────────────────────────
  const collections = await prisma.collection.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: {
      items: {
        include: { item: { include: { type: true } } },
        orderBy: { addedAt: "asc" },
      },
    },
  });

  console.log(`\nCollections (${collections.length}):`);
  for (const col of collections) {
    console.log(`\n  📁 ${col.name}`);
    console.log(`     ${col.description}`);
    for (const { item } of col.items) {
      const preview = item.content
        ? item.content.slice(0, 60).replace(/\n/g, " ") + "…"
        : item.url ?? "";
      console.log(`     [${item.type.name.padEnd(8)}] ${item.title}`);
      if (preview) console.log(`              ${preview}`);
    }
  }
}

main()
  .catch((e) => {
    console.error("✗", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
