export const DEFAULT_AFTER_SIGN_IN = "/dashboard"

// Returns a same-origin path for `raw`, or `fallback` when `raw` is missing,
// malformed or points at another origin. Resolving through `URL` (rather than
// string prefix checks) also catches `//evil`, `/\evil`, embedded tabs and
// `javascript:` URLs. Absolute same-origin URLs are accepted because NextAuth's
// middleware sets `callbackUrl` to the full `request.nextUrl.href`.
export function safeCallbackUrl(
  raw: string | null | undefined,
  origin: string,
  fallback: string = DEFAULT_AFTER_SIGN_IN,
): string {
  if (!raw) return fallback

  let base: URL
  let url: URL
  try {
    base = new URL(origin)
    url = new URL(raw, base)
  } catch {
    return fallback
  }

  if (url.origin !== base.origin) return fallback
  return `${url.pathname}${url.search}${url.hash}`
}
