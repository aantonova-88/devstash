"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import {
  deleteItem as deleteItemQuery,
  updateItem as updateItemQuery,
} from "@/lib/db/items"
import { updateItemSchema, type UpdateItemInput } from "@/lib/validation/item"
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
