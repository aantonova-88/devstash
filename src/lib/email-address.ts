export const MAX_NAME_LENGTH = 100

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

// Case-insensitive match on `User.email`. New accounts are stored normalized,
// but rows created before normalization may contain uppercase letters, so an
// exact match on the lowercased input would lock those users out.
export function emailMatch(email: string) {
  return { email: { equals: normalizeEmail(email), mode: "insensitive" as const } }
}
