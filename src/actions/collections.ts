"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import {
  createCollection as createCollectionQuery,
  deleteCollection as deleteCollectionQuery,
  updateCollection as updateCollectionQuery,
} from "@/lib/db/collections"
import {
  createCollectionSchema,
  updateCollectionSchema,
  type CreateCollectionInput,
  type UpdateCollectionInput,
} from "@/lib/validation/collection"
import type { ActionResult } from "@/actions/items"
import type {
  CollectionSummary,
  CreatedCollection,
  DeletedCollection,
} from "@/lib/db/collections"

/** Same message for a foreign and an unknown collection id. */
const COLLECTION_NOT_FOUND = "Collection not found."

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

/**
 * Update a collection's name and description. Ownership is enforced by the
 * query, scoped to the session user.
 */
export async function updateCollection(
  collectionId: string,
  input: UpdateCollectionInput
): Promise<ActionResult<CollectionSummary>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" }
    }

    const parsed = updateCollectionSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const collection = await updateCollectionQuery(session.user.id, collectionId, parsed.data)
    if (!collection) {
      return { success: false, error: COLLECTION_NOT_FOUND }
    }

    revalidatePath("/", "layout")

    return { success: true, data: collection }
  } catch (err) {
    console.error("updateCollection failed", err)
    return { success: false, error: "Could not update this collection." }
  }
}

/**
 * Delete a collection. Its items are kept — only their membership in this
 * collection goes.
 */
export async function deleteCollection(
  collectionId: string
): Promise<ActionResult<DeletedCollection>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" }
    }

    const collection = await deleteCollectionQuery(session.user.id, collectionId)
    if (!collection) {
      return { success: false, error: COLLECTION_NOT_FOUND }
    }

    revalidatePath("/", "layout")

    return { success: true, data: collection }
  } catch (err) {
    console.error("deleteCollection failed", err)
    return { success: false, error: "Could not delete this collection." }
  }
}
