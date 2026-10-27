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
  /** Proxy URL (`/api/items/<id>/file`), never the R2 key; null when no file. */
  fileUrl: string | null
  type: { name: string; slug: string; icon: string; color: string }
  tags: { tag: { name: string } }[]
}

export interface ItemStats {
  totalItems: number
  favoriteItemsCount: number
}

const itemCardInclude = {
  type: { select: { name: true, slug: true, icon: true, color: true } },
  tags: { include: { tag: { select: { name: true } } } },
} as const

type ItemCardRow = Awaited<
  ReturnType<typeof prisma.item.findFirstOrThrow<{ include: typeof itemCardInclude }>>
>

/**
 * Fields are picked explicitly rather than spread: the row carries every
 * column, including `fileUrl` (the private R2 key) and `userId`, and whatever
 * is returned here is serialized into the client component's props.
 */
function serializeItem(item: ItemCardRow): ItemWithMeta {
  return {
    id: item.id,
    title: item.title,
    content: item.content,
    language: item.language,
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    lastUsedAt: item.lastUsedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    fileUrl: item.fileUrl ? itemFileUrl(item.id) : null,
    type: item.type,
    tags: item.tags.map(({ tag }) => ({ tag: { name: tag.name } })),
  }
}

export async function getPinnedItems(userId: string): Promise<ItemWithMeta[]> {
  const items = await prisma.item.findMany({
    where: { userId, isPinned: true },
    include: itemCardInclude,
    orderBy: { updatedAt: "desc" },
  })

  return items.map(serializeItem)
}

export async function getRecentItems(userId: string, limit = 10): Promise<ItemWithMeta[]> {
  const items = await prisma.item.findMany({
    where: { userId },
    include: itemCardInclude,
    orderBy: [
      { lastUsedAt: { sort: "desc", nulls: "last" } },
      { updatedAt: "desc" },
    ],
    take: limit,
  })

  return items.map(serializeItem)
}

/**
 * `cache()`-wrapped because the shell layout fetches this for the sidebar and
 * `/items/[type]` needs the same list for its type-specific create button —
 * both render in one request, so this keeps it to a single pair of queries.
 */
export const getSystemItemTypes = cache(async function getSystemItemTypes(
  userId: string,
): Promise<SidebarItemType[]> {
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
})

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

/**
 * Resolve a client-supplied type id to a system ItemType row.
 * Restricting to `isSystem` means an id naming another user's custom type
 * resolves to null rather than being trusted, so the caller can reject it.
 */
export async function getSystemItemTypeById(
  typeId: string
): Promise<ItemTypeSummary | null> {
  return prisma.itemType.findFirst({
    where: { id: typeId, isSystem: true },
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      color: true,
      category: true,
    },
  })
}

export async function getItemsByType(
  userId: string,
  typeId: string
): Promise<ItemWithMeta[]> {
  const items = await prisma.item.findMany({
    where: { userId, typeId },
    include: itemCardInclude,
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

export interface ItemDetail {
  id: string
  title: string
  description: string | null
  content: string | null
  url: string | null
  fileUrl: string | null
  fileName: string | null
  fileSize: number | null
  language: string | null
  isFavorite: boolean
  isPinned: boolean
  aiSummary: string | null
  aiTags: string[]
  lastUsedAt: string | null
  createdAt: string
  updatedAt: string
  type: ItemTypeSummary
  tags: { name: string }[]
  collections: { id: string; name: string }[]
}

/**
 * Full detail for a single item, used by the item drawer.
 * Scoped by `userId` so one user can never read another's item — an unknown
 * or foreign id both return null, which the API route turns into a 404.
 */
export async function getItemById(
  userId: string,
  itemId: string
): Promise<ItemDetail | null> {
  const item = await prisma.item.findFirst({
    where: { id: itemId, userId },
    include: itemDetailInclude,
  })

  if (!item) return null

  return serializeItemDetail(item)
}

/**
 * Fields every ItemDetail query needs. Shared so `getItemById` and `updateItem`
 * can hand their result to the same serializer.
 */
const itemDetailInclude = {
  type: {
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      color: true,
      category: true,
    },
  },
  tags: { include: { tag: { select: { name: true } } } },
  collections: {
    include: { collection: { select: { id: true, name: true } } },
    orderBy: { addedAt: "asc" },
  },
} as const

type ItemDetailRow = Awaited<
  ReturnType<typeof prisma.item.findFirstOrThrow<{ include: typeof itemDetailInclude }>>
>

/**
 * Same-origin URL that streams an item's file. The `fileUrl` column holds the
 * private R2 key, which is never sent to the client: every read goes through
 * this ownership-checked proxy instead.
 */
export function itemFileUrl(itemId: string): string {
  return `/api/items/${itemId}/file`
}

function serializeItemDetail(item: ItemDetailRow): ItemDetail {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    content: item.content,
    url: item.url,
    fileUrl: item.fileUrl ? itemFileUrl(item.id) : null,
    fileName: item.fileName,
    fileSize: item.fileSize,
    language: item.language,
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    aiSummary: item.aiSummary,
    aiTags: item.aiTags,
    lastUsedAt: item.lastUsedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    type: item.type,
    tags: item.tags.map(({ tag }) => ({ name: tag.name })),
    collections: item.collections.map(({ collection }) => collection),
  }
}

export interface UpdateItemFields {
  title: string
  description: string | null
  content: string | null
  language: string | null
  url: string | null
  tags: string[]
}

/**
 * Update one item and replace its tag set.
 *
 * The `userId` in the `where` clause is the ownership check: Prisma throws
 * P2025 when no row matches, so another user's id behaves exactly like an
 * unknown one and this returns null. Tags are replaced wholesale — the join
 * rows are dropped and recreated, with `connectOrCreate` on `Tag` because
 * `Tag.name` is unique across all users.
 */
export async function updateItem(
  userId: string,
  itemId: string,
  fields: UpdateItemFields
): Promise<ItemDetail | null> {
  const { tags, ...scalars } = fields

  try {
    const item = await prisma.item.update({
      where: { id: itemId, userId },
      data: {
        ...scalars,
        tags: {
          deleteMany: {},
          create: tags.map((name) => ({
            tag: {
              connectOrCreate: { where: { name }, create: { name } },
            },
          })),
        },
      },
      include: itemDetailInclude,
    })

    return serializeItemDetail(item)
  } catch (err) {
    if ((err as { code?: string }).code === "P2025") return null
    throw err
  }
}

export interface DeletedItem {
  id: string
  title: string
  typeSlug: string
  /** R2 key of the item's file, so the caller can remove the object too. */
  fileKey: string | null
}

/**
 * Permanently delete one item.
 *
 * Ownership works exactly as in `updateItem`: `userId` sits in the `where`
 * clause, so another user's id raises P2025 and is indistinguishable from an
 * unknown one. The `ItemTag` and `ItemCollection` join rows cascade. The
 * deleted row's type slug is returned so the caller can revalidate
 * `/items/<slug>` without a second query, along with the file's R2 key.
 */
export async function deleteItem(
  userId: string,
  itemId: string
): Promise<DeletedItem | null> {
  try {
    const item = await prisma.item.delete({
      where: { id: itemId, userId },
      select: {
        id: true,
        title: true,
        fileUrl: true,
        type: { select: { slug: true } },
      },
    })

    return {
      id: item.id,
      title: item.title,
      typeSlug: item.type.slug,
      fileKey: item.fileUrl,
    }
  } catch (err) {
    if ((err as { code?: string }).code === "P2025") return null
    throw err
  }
}

export interface CreateItemFields {
  typeId: string
  title: string
  description: string | null
  content: string | null
  language: string | null
  url: string | null
  /** R2 key; null for every non-FILE type. */
  fileUrl: string | null
  fileName: string | null
  fileSize: number | null
  tags: string[]
}

/**
 * Create one item for a user and attach its tag set.
 *
 * `userId` comes from the caller's session and `typeId` has already been
 * resolved against `ItemType`, so there is nothing here to authorise — a
 * failure is a genuine database error and is left to throw. Tags use the same
 * `connectOrCreate` as `updateItem` because `Tag.name` is unique across users.
 */
export async function createItem(
  userId: string,
  fields: CreateItemFields
): Promise<ItemDetail> {
  const { tags, ...scalars } = fields

  const item = await prisma.item.create({
    data: {
      ...scalars,
      userId,
      tags: {
        create: tags.map((name) => ({
          tag: {
            connectOrCreate: { where: { name }, create: { name } },
          },
        })),
      },
    },
    include: itemDetailInclude,
  })

  return serializeItemDetail(item)
}

export interface ItemFile {
  key: string
  fileName: string | null
}

/**
 * The R2 key and name behind one item's file, for the download proxy. Scoped by
 * `userId` like `getItemById`, so a foreign item and an item with no file both
 * return null.
 */
export async function getItemFile(
  userId: string,
  itemId: string
): Promise<ItemFile | null> {
  const item = await prisma.item.findFirst({
    where: { id: itemId, userId },
    select: { fileUrl: true, fileName: true },
  })

  if (!item?.fileUrl) return null

  return { key: item.fileUrl, fileName: item.fileName }
}
