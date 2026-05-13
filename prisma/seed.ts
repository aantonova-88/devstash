import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ContentCategory } from "../src/generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const systemTypes = [
  { name: "Snippet",  slug: "snippets", icon: "Code",       color: "#3b82f6", category: ContentCategory.TEXT, order: 0 },
  { name: "Prompt",   slug: "prompts",  icon: "Sparkles",   color: "#8b5cf6", category: ContentCategory.TEXT, order: 1 },
  { name: "Note",     slug: "notes",    icon: "StickyNote", color: "#fde047", category: ContentCategory.TEXT, order: 2 },
  { name: "Command",  slug: "commands", icon: "Terminal",   color: "#f97316", category: ContentCategory.TEXT, order: 3 },
  { name: "Link",     slug: "links",    icon: "Link",       color: "#10b981", category: ContentCategory.URL,  order: 4 },
  { name: "File",     slug: "files",    icon: "File",       color: "#6b7280", category: ContentCategory.FILE, order: 5 },
  { name: "Image",    slug: "images",   icon: "Image",      color: "#ec4899", category: ContentCategory.FILE, order: 6 },
];

async function main() {
  console.log("Seeding system item types...");

  for (const type of systemTypes) {
    const existing = await prisma.itemType.findFirst({
      where: { slug: type.slug, userId: null },
    });
    if (!existing) {
      await prisma.itemType.create({ data: { ...type, isSystem: true, userId: null } });
    }
    console.log(`  ✓ ${type.name}`);
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
