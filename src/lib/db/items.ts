import { cache } from "react"
import { prisma } from "@/lib/prisma"

export interface SidebarItemType {
  id: string
  name: string
  slug: string
  icon: string
  color: string
  category: string
  count: number
}

export interface ItemWithMeta {
  id: string
  title: string
  content: string | null
  language: string | null
  isFavorite: boolean
  isPinned: boolean
  lastUsedAt: string | null
  createdAt: string
  updatedAt: string
  type: { name: string; icon: string; color: string }
  tags: { tag: { name: string } }[]
}

export interface ItemStats {
  totalItems: number
  favoriteItemsCount: number
}

function serializeItem(item: {
  id: string
  title: string
  content: string | null
  language: string | null
  isFavorite: boolean
  isPinned: boolean
  lastUsedAt: Date | null
  createdAt: Date
  updatedAt: Date
  type: { name: string; icon: string; color: string }
  tags: { tag: { name: string } }[]
}): ItemWithMeta {
  return {
    ...item,
    lastUsedAt: item.lastUsedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}

export async function getPinnedItems(userId: string): Promise<ItemWithMeta[]> {
  const items = await prisma.item.findMany({
    where: { userId, isPinned: true },
    include: {
      type: { select: { name: true, icon: true, color: true } },
      tags: { include: { tag: { select: { name: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  })

  return items.map(serializeItem)
}

export async function getRecentItems(userId: string, limit = 10): Promise<ItemWithMeta[]> {
  const items = await prisma.item.findMany({
    where: { userId },
    include: {
      type: { select: { name: true, icon: true, color: true } },
      tags: { include: { tag: { select: { name: true } } } },
    },
    orderBy: [
      { lastUsedAt: { sort: "desc", nulls: "last" } },
      { updatedAt: "desc" },
    ],
    take: limit,
  })

  return items.map(serializeItem)
}

export async function getSystemItemTypes(userId: string): Promise<SidebarItemType[]> {
  const [types, counts] = await Promise.all([
    prisma.itemType.findMany({
      where: { isSystem: true },
      orderBy: { order: "asc" },
    }),
    prisma.item.groupBy({
      by: ["typeId"],
      where: { userId },
      _count: true,
    }),
  ])

  const countMap = new Map(counts.map((c) => [c.typeId, c._count]))

  return types.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    icon: t.icon,
    color: t.color,
    category: t.category,
    count: countMap.get(t.id) ?? 0,
  }))
}

export interface ItemTypeSummary {
  id: string
  name: string
  slug: string
  icon: string
  color: string
  category: string
}

/**
 * Resolve a route slug (e.g. "snippets") to a system ItemType row.
 * Returns null for unknown slugs so the page can render a 404.
 */
export const getItemTypeBySlug = cache(
  async (slug: string): Promise<ItemTypeSummary | null> => {
    const type = await prisma.itemType.findFirst({
      where: { slug, isSystem: true },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        color: true,
        category: true,
      },
    })

    return type
  }
)

export async function getItemsByType(
  userId: string,
  typeId: string
): Promise<ItemWithMeta[]> {
  const items = await prisma.item.findMany({
    where: { userId, typeId },
    include: {
      type: { select: { name: true, icon: true, color: true } },
      tags: { include: { tag: { select: { name: true } } } },
    },
    orderBy: [
      { isPinned: "desc" },
      { lastUsedAt: { sort: "desc", nulls: "last" } },
      { updatedAt: "desc" },
    ],
  })

  return items.map(serializeItem)
}

export async function getItemStats(userId: string): Promise<ItemStats> {
  const [totalItems, favoriteItemsCount] = await Promise.all([
    prisma.item.count({ where: { userId } }),
    prisma.item.count({ where: { userId, isFavorite: true } }),
  ])

  return { totalItems, favoriteItemsCount }
}

export interface ProfileStats {
  totalItems: number
  totalCollections: number
  typeBreakdown: Array<{
    id: string
    name: string
    slug: string
    icon: string
    color: string
    count: number
  }>
}

export async function getProfileStats(userId: string): Promise<ProfileStats> {
  const [totalItems, totalCollections, types, counts] = await Promise.all([
    prisma.item.count({ where: { userId } }),
    prisma.collection.count({ where: { userId } }),
    prisma.itemType.findMany({
      where: { isSystem: true },
      orderBy: { order: "asc" },
    }),
    prisma.item.groupBy({
      by: ["typeId"],
      where: { userId },
      _count: true,
    }),
  ])

  const countMap = new Map(counts.map((c) => [c.typeId, c._count]))

  return {
    totalItems,
    totalCollections,
    typeBreakdown: types.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      icon: t.icon,
      color: t.color,
      count: countMap.get(t.id) ?? 0,
    })),
  }
}
