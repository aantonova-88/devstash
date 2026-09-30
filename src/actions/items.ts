"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import {
  createItem as createItemQuery,
  deleteItem as deleteItemQuery,
  getSystemItemTypeById,
  updateItem as updateItemQuery,
} from "@/lib/db/items"
import {
  contentFieldsForType,
  createItemSchema,
  updateItemSchema,
  type CreateItemInput,
  type UpdateItemInput,
} from "@/lib/validation/item"
import type { DeletedItem, ItemDetail } from "@/lib/db/items"

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Update the editable fields of one item.
 *
 * Ownership is enforced inside the query — the session's user id goes into the
 * `where` clause, so a foreign item id is indistinguishable from a missing one.
 * Zod is the source of truth for validation; the drawer's disabled Save button
 * is only a UX affordance.
 */
export async function updateItem(
  itemId: string,
  input: UpdateItemInput
): Promise<ActionResult<ItemDetail>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" }
    }

    const parsed = updateItemSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const item = await updateItemQuery(session.user.id, itemId, parsed.data)
    if (!item) {
      return { success: false, error: "Item not found" }
    }

    revalidatePath("/dashboard")
    revalidatePath(`/items/${item.type.slug}`)

    return { success: true, data: item }
  } catch (err) {
    console.error("updateItem failed", err)
    return { success: false, error: "Could not save this item." }
  }
}

/**
 * Permanently delete one item.
 *
 * Ownership is enforced inside the query, so a foreign item id returns the same
 * "not found" as an unknown one. The deleted row's type slug comes back with it
 * so the type listing can be revalidated without a second lookup.
 */
export async function deleteItem(
  itemId: string
): Promise<ActionResult<DeletedItem>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" }
    }

    const item = await deleteItemQuery(session.user.id, itemId)
    if (!item) {
      return { success: false, error: "Item not found" }
    }

    revalidatePath("/dashboard")
    revalidatePath(`/items/${item.typeSlug}`)

    return { success: true, data: item }
  } catch (err) {
    console.error("deleteItem failed", err)
    return { success: false, error: "Could not delete this item." }
  }
}

/**
 * Create one item of a chosen type.
 *
 * The request names a type id, so the type is resolved from the database first:
 * that rejects an unknown or non-system id, and makes the resolved category —
 * not the client — decide which content fields are stored.
 */
export async function createItem(
  input: CreateItemInput
): Promise<ActionResult<ItemDetail>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" }
    }

    const parsed = createItemSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const type = await getSystemItemTypeById(parsed.data.typeId)
    if (!type) {
      return { success: false, error: "Unknown item type" }
    }

    const content = contentFieldsForType(type, parsed.data)
    if (!content.ok) {
      return { success: false, error: content.error }
    }

    const item = await createItemQuery(session.user.id, {
      typeId: type.id,
      title: parsed.data.title,
      description: parsed.data.description,
      tags: parsed.data.tags,
      ...content.fields,
    })

    revalidatePath("/dashboard")
    revalidatePath(`/items/${type.slug}`)

    return { success: true, data: item }
  } catch (err) {
    console.error("createItem failed", err)
    return { success: false, error: "Could not create this item." }
  }
}
