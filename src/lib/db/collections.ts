import { cache } from "react"
import { prisma } from "@/lib/prisma"
import type {
  CreateCollectionData,
  UpdateCollectionData,
} from "@/lib/validation/collection"

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

export const getRecentCollections = cache(async (userId: string): Promise<CollectionWithMeta[]> => {
  const collections = await prisma.collection.findMany({
    where: { userId },
    include: {
      // Only the type is needed, to count items and pick the dominant type —
      // never load the items' own columns (content can be large).
      items: {
        select: {
          item: {
            select: {
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
})

export interface CollectionSummary {
  id: string
  name: string
  description: string | null
  isFavorite: boolean
}

/**
 * One collection owned by `userId`, or `null` — an unknown id and another
 * user's id are indistinguishable.
 */
export async function getCollectionById(
  userId: string,
  collectionId: string
): Promise<CollectionSummary | null> {
  return prisma.collection.findFirst({
    where: { id: collectionId, userId },
    select: { id: true, name: true, description: true, isFavorite: true },
  })
}

export interface CreatedCollection {
  id: string
  name: string
  description: string | null
}

/** Create an empty collection owned by `userId`. */
export async function createCollection(
  userId: string,
  fields: CreateCollectionData
): Promise<CreatedCollection> {
  return prisma.collection.create({
    data: {
      userId,
      name: fields.name,
      description: fields.description,
    },
    select: { id: true, name: true, description: true },
  })
}

/**
 * Update the metadata of a collection owned by `userId`. Ownership is the
 * `userId` in the `where` clause, so another user's id raises P2025 exactly
 * like an unknown one and this returns null.
 */
export async function updateCollection(
  userId: string,
  collectionId: string,
  fields: UpdateCollectionData
): Promise<CollectionSummary | null> {
  try {
    return await prisma.collection.update({
      where: { id: collectionId, userId },
      data: { name: fields.name, description: fields.description },
      select: { id: true, name: true, description: true, isFavorite: true },
    })
  } catch (err) {
    if ((err as { code?: string }).code === "P2025") return null
    throw err
  }
}

export interface DeletedCollection {
  id: string
  name: string
}

/**
 * Delete a collection owned by `userId`, or return null for a foreign or
 * unknown id. Only the `ItemCollection` membership rows cascade — the items
 * themselves are untouched and stay in the user's library.
 */
export async function deleteCollection(
  userId: string,
  collectionId: string
): Promise<DeletedCollection | null> {
  try {
    return await prisma.collection.delete({
      where: { id: collectionId, userId },
      select: { id: true, name: true },
    })
  } catch (err) {
    if ((err as { code?: string }).code === "P2025") return null
    throw err
  }
}

/**
 * Whether every id names a collection owned by `userId`. Ids must already be
 * deduplicated. A foreign id and an unknown id both make this false, so the
 * caller cannot tell which it was.
 */
export async function ownsCollections(userId: string, ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true

  const owned = await prisma.collection.count({
    where: { id: { in: ids }, userId },
  })

  return owned === ids.length
}
