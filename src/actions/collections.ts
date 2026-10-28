"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { createCollection as createCollectionQuery } from "@/lib/db/collections"
import {
  createCollectionSchema,
  type CreateCollectionInput,
} from "@/lib/validation/collection"
import type { ActionResult } from "@/actions/items"
import type { CreatedCollection } from "@/lib/db/collections"

/**
 * Create a collection for the signed-in user.
 *
 * The owner is always the session user — the input carries no user id. Every
 * shell layout renders collections in the sidebar, so the whole layout tree is
 * revalidated rather than individual pages.
 */
export async function createCollection(
  input: CreateCollectionInput
): Promise<ActionResult<CreatedCollection>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" }
    }

    const parsed = createCollectionSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const collection = await createCollectionQuery(session.user.id, parsed.data)

    revalidatePath("/", "layout")

    return { success: true, data: collection }
  } catch (err) {
    console.error("createCollection failed", err)
    return { success: false, error: "Could not create this collection." }
  }
}
