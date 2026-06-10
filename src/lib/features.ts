export function isEmailVerificationEnabled(): boolean {
  const raw = process.env.EMAIL_VERIFICATION_ENABLED
  if (raw === undefined) return process.env.NODE_ENV === "production"
  return raw.toLowerCase() === "true"
}
