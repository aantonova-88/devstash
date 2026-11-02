export const ITEMS_PER_PAGE = 21
export const COLLECTIONS_PER_PAGE = 21
export const DASHBOARD_COLLECTIONS_LIMIT = 6
export const DASHBOARD_RECENT_ITEMS_LIMIT = 10

export interface PageWindow {
  skip: number
  take: number
}

/**
 * The `?page=` search param as a 1-based page number. Anything that is not a
 * positive integer — missing, repeated, `0`, `-2`, `1.5`, `abc` — is page 1.
 */
export function parsePage(raw: string | string[] | undefined): number {
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) return 1
  const page = Number(raw)
  return Number.isSafeInteger(page) && page >= 1 ? page : 1
}

export function pageWindow(page: number, perPage: number): PageWindow {
  return { skip: (page - 1) * perPage, take: perPage }
}

/** Never 0, so an empty list still reads as "page 1 of 1". */
export function totalPages(total: number, perPage: number): number {
  return Math.max(1, Math.ceil(total / perPage))
}

export type PageLink = number | "ellipsis"

/**
 * Page numbers to render: always the first and last, `siblings` either side of
 * the current one, and an ellipsis for each gap. A gap of a single page shows
 * that page instead, since an ellipsis would take the same space.
 */
export function pageLinks(current: number, total: number, siblings = 1): PageLink[] {
  const start = Math.max(1, current - siblings)
  const end = Math.min(total, current + siblings)

  const pages = new Set<number>([1, total])
  for (let page = start; page <= end; page++) pages.add(page)

  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b)
  const links: PageLink[] = []
  for (const page of sorted) {
    const previous = links.at(-1)
    if (typeof previous === "number") {
      if (page - previous === 2) links.push(previous + 1)
      else if (page - previous > 2) links.push("ellipsis")
    }
    links.push(page)
  }
  return links
}

/** `?page=` link for a list; page 1 is the bare path so it has one canonical URL. */
export function pageHref(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}?page=${page}`
}
