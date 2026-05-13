import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Testing database connection...");

  await prisma.$queryRaw`SELECT 1`;
  console.log("✓ Connected to Neon PostgreSQL");

  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `;
  console.log(
    "✓ Tables in database:",
    tables.map((t) => t.tablename).join(", ")
  );
}

main()
  .catch((e) => {
    console.error("✗ Database connection failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
