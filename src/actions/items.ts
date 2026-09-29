"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { updateItem as updateItemQuery } from "@/lib/db/items"
import { updateItemSchema, type UpdateItemInput } from "@/lib/validation/item"
import type { ItemDetail } from "@/lib/db/items"

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
