import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { pageHref, pageLinks } from "@/lib/pagination"

interface PaginationProps {
  basePath: string
  page: number
  totalPages: number
}

export function Pagination({ basePath, page, totalPages }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1 pt-2">
      <PageStep
        href={page > 1 ? pageHref(basePath, page - 1) : null}
        label="Previous"
        rel="prev"
      />

      {pageLinks(page, totalPages).map((link, index) =>
        link === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            aria-hidden
            className="w-8 text-center text-sm text-muted-foreground"
          >
            …
          </span>
        ) : (
          <Link
            key={link}
            href={pageHref(basePath, link)}
            aria-label={`Page ${link}`}
            aria-current={link === page ? "page" : undefined}
            className={cn(
              buttonVariants({ variant: link === page ? "outline" : "ghost", size: "icon" }),
              "tabular-nums",
              link !== page && "text-muted-foreground"
            )}
          >
            {link}
          </Link>
        )
      )}

      <PageStep
        href={page < totalPages ? pageHref(basePath, page + 1) : null}
        label="Next"
        rel="next"
      />
    </nav>
  )
}

function PageStep({
  href,
  label,
  rel,
}: {
  href: string | null
  label: "Previous" | "Next"
  rel: "prev" | "next"
}) {
  const content =
    label === "Previous" ? (
      <>
        <ChevronLeft />
        <span className="hidden sm:inline">Previous</span>
      </>
    ) : (
      <>
        <span className="hidden sm:inline">Next</span>
        <ChevronRight />
      </>
    )
  const className = cn(buttonVariants({ variant: "ghost" }), "px-2")

  if (!href) {
    return (
      <span
        aria-disabled="true"
        aria-label={label}
        className={cn(className, "pointer-events-none opacity-40")}
      >
        {content}
      </span>
    )
  }

  return (
    <Link href={href} rel={rel} aria-label={label} className={className}>
      {content}
    </Link>
  )
}
