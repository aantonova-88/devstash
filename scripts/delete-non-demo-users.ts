import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const DEMO_EMAIL = "demo@devstash.io";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const apply = process.argv.includes("--yes") || process.argv.includes("-y");

  const demo = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!demo) throw new Error(`Demo user (${DEMO_EMAIL}) not found — aborting`);

  const targets = await prisma.user.findMany({
    where: { email: { not: DEMO_EMAIL } },
    select: {
      id: true,
      email: true,
      name: true,
      _count: {
        select: { items: true, collections: true, itemTypes: true, accounts: true, sessions: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Demo user preserved: ${demo.name ?? "(no name)"} <${demo.email}>`);
  console.log(`\nUsers to delete (${targets.length}):`);
  if (targets.length === 0) {
    console.log("  (none)");
  } else {
    for (const u of targets) {
      const c = u._count;
      console.log(
        `  • ${u.email.padEnd(40)} items=${c.items} collections=${c.collections} customTypes=${c.itemTypes} accounts=${c.accounts} sessions=${c.sessions}`,
      );
    }
  }

  const orphanTokens = await prisma.verificationToken.count({
    where: { identifier: { not: DEMO_EMAIL } },
  });
  console.log(`\nVerificationToken rows to delete: ${orphanTokens}`);

  if (!apply) {
    console.log("\nDry run. Re-run with --yes to apply.");
    return;
  }

  if (targets.length === 0 && orphanTokens === 0) {
    console.log("\nNothing to delete.");
    return;
  }

  const result = await prisma.$transaction([
    prisma.user.deleteMany({ where: { email: { not: DEMO_EMAIL } } }),
    prisma.verificationToken.deleteMany({ where: { identifier: { not: DEMO_EMAIL } } }),
  ]);

  console.log(`\n✓ Deleted ${result[0].count} users (cascade removed their items, collections, custom types, accounts, sessions).`);
  console.log(`✓ Deleted ${result[1].count} verification tokens.`);
}

main()
  .catch((e) => {
    console.error("✗", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
