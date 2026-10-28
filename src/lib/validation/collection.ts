import { z } from "zod"

export const COLLECTION_NAME_MAX_LENGTH = 100
export const COLLECTION_DESCRIPTION_MAX_LENGTH = 500

export const createCollectionSchema = z.object({
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
})

export type CreateCollectionInput = z.input<typeof createCollectionSchema>
export type CreateCollectionData = z.output<typeof createCollectionSchema>
