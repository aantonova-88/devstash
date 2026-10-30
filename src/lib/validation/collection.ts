import { z } from "zod"

export const COLLECTION_NAME_MAX_LENGTH = 100
export const COLLECTION_DESCRIPTION_MAX_LENGTH = 500

// The editable fields, shared by create and update so the two cannot drift.
const collectionFields = {
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(COLLECTION_NAME_MAX_LENGTH, "Name is too long"),
  // Trimmed, and an empty string is stored as null rather than "".
  description: z
    .string()
    .trim()
    .max(COLLECTION_DESCRIPTION_MAX_LENGTH, "Description is too long")
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .default(null),
}

export const createCollectionSchema = z.object(collectionFields)

export const updateCollectionSchema = z.object(collectionFields)

export type CreateCollectionInput = z.input<typeof createCollectionSchema>
export type CreateCollectionData = z.output<typeof createCollectionSchema>

export type UpdateCollectionInput = z.input<typeof updateCollectionSchema>
export type UpdateCollectionData = z.output<typeof updateCollectionSchema>
