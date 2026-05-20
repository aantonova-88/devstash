import { prisma } from "@/lib/prisma"

const DEMO_USER_EMAIL = "demo@devstash.io"

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
  userName: string | null
}

async function getDemoUser() {
  return prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
    select: { id: true, name: true },
  })
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

export async function getPinnedItems(): Promise<ItemWithMeta[]> {
  const user = await getDemoUser()
  if (!user) return []

  const items = await prisma.item.findMany({
    where: { userId: user.id, isPinned: true },
    include: {
      type: { select: { name: true, icon: true, color: true } },
      tags: { include: { tag: { select: { name: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  })

  return items.map(serializeItem)
}

export async function getRecentItems(limit = 10): Promise<ItemWithMeta[]> {
  const user = await getDemoUser()
  if (!user) return []

  const items = await prisma.item.findMany({
    where: { userId: user.id },
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

export async function getItemStats(): Promise<ItemStats> {
  const user = await getDemoUser()
  if (!user) return { totalItems: 0, favoriteItemsCount: 0, userName: null }

  const [totalItems, favoriteItemsCount] = await Promise.all([
    prisma.item.count({ where: { userId: user.id } }),
    prisma.item.count({ where: { userId: user.id, isFavorite: true } }),
  ])

  return { totalItems, favoriteItemsCount, userName: user.name }
}
