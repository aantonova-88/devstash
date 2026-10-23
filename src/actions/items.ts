"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import {
  createItem as createItemQuery,
  deleteItem as deleteItemQuery,
  getSystemItemTypeById,
  updateItem as updateItemQuery,
} from "@/lib/db/items"
import { deleteObject, headObject } from "@/lib/r2"
import {
  FILE_CONSTRAINTS,
  isFileTypeSlug,
  isOwnedObjectKey,
} from "@/lib/validation/file"
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
 *
 * A File or Image item's R2 object is removed after the row. A storage failure
 * is logged rather than surfaced: the item is already gone, so reporting the
 * delete as failed would be wrong, and the cost is one orphaned object.
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

    if (item.fileKey) {
      await deleteObject(item.fileKey).catch((err) => {
        console.error("deleteItem: could not remove file from R2", item.fileKey, err)
      })
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

    const file = content.fileKey
      ? await resolveUploadedFile(session.user.id, type.slug, content.fileKey)
      : { ok: true as const, fields: { fileUrl: null, fileName: null, fileSize: null } }
    if (!file.ok) {
      return { success: false, error: file.error }
    }

    const item = await createItemQuery(session.user.id, {
      typeId: type.id,
      title: parsed.data.title,
      description: parsed.data.description,
      tags: parsed.data.tags,
      ...content.fields,
      ...file.fields,
    })

    revalidatePath("/dashboard")
    revalidatePath(`/items/${type.slug}`)

    return { success: true, data: item }
  } catch (err) {
    console.error("createItem failed", err)
    return { success: false, error: "Could not create this item." }
  }
}

type ResolvedFile =
  | {
      ok: true
      fields: { fileUrl: string; fileName: string; fileSize: number }
    }
  | { ok: false; error: string }

/**
 * Turn a client-supplied upload key into the file fields to store.
 *
 * The key must carry this user's id and this type's slug, so a request cannot
 * attach someone else's object or an image to a File item. Size and name are
 * then read from R2 itself rather than from the request, and the size limit is
 * re-checked against what was actually stored.
 */
async function resolveUploadedFile(
  userId: string,
  typeSlug: string,
  key: string
): Promise<ResolvedFile> {
  if (!isFileTypeSlug(typeSlug) || !isOwnedObjectKey(key, userId, typeSlug)) {
    return { ok: false, error: "Invalid upload. Please upload the file again." }
  }

  const stored = await headObject(key)
  if (!stored) {
    return { ok: false, error: "Upload not found. Please upload the file again." }
  }

  if (stored.size > FILE_CONSTRAINTS[typeSlug].maxBytes) {
    return { ok: false, error: "File is too large." }
  }

  return {
    ok: true,
    fields: {
      fileUrl: key,
      fileName: stored.fileName ?? key.slice(key.lastIndexOf("/") + 1),
      fileSize: stored.size,
    },
  }
}
