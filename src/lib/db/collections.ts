import { prisma } from "@/lib/prisma"

const DEMO_USER_EMAIL = "demo@devstash.io"

export interface CollectionWithMeta {
  id: string
  name: string
  description: string | null
  isFavorite: boolean
  updatedAt: Date
  itemCount: number
  dominantColor: string
  dominantIcon: string
  typeIcons: Array<{ icon: string; color: string; name: string }>
}

export async function getRecentCollections(): Promise<CollectionWithMeta[]> {
  const user = await prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
    select: { id: true },
  })

  if (!user) return []

  const collections = await prisma.collection.findMany({
    where: { userId: user.id },
    include: {
      items: {
        include: {
          item: {
            include: {
              type: {
                select: { icon: true, color: true, name: true },
              },
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  return collections.map((col) => {
    const itemCount = col.items.length

    const typeCounts = new Map<string, { count: number; icon: string; color: string; name: string }>()
    for (const ic of col.items) {
      const type = ic.item.type
      const existing = typeCounts.get(type.name)
      if (existing) {
        existing.count++
      } else {
        typeCounts.set(type.name, { count: 1, icon: type.icon, color: type.color, name: type.name })
      }
    }

    let dominantColor = "#6b7280"
    let dominantIcon = "FolderOpen"
    let maxCount = 0
    for (const typeData of typeCounts.values()) {
      if (typeData.count > maxCount) {
        maxCount = typeData.count
        dominantColor = typeData.color
        dominantIcon = typeData.icon
      }
    }

    const typeIcons = [...typeCounts.values()]
      .sort((a, b) => b.count - a.count)
      .map(({ icon, color, name }) => ({ icon, color, name }))

    return {
      id: col.id,
      name: col.name,
      description: col.description,
      isFavorite: col.isFavorite,
      updatedAt: col.updatedAt,
      itemCount,
      dominantColor,
      dominantIcon,
      typeIcons,
    }
  })
}
