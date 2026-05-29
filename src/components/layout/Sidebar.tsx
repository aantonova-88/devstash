"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  File,
  PanelLeftClose,
  LogOut,
  User,
  Plus,
  ChevronRight,
  Star,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ICON_MAP } from "@/lib/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { UserAvatar } from "@/components/ui/user-avatar"
import type { SidebarItemType } from "@/lib/db/items"
import type { CollectionWithMeta } from "@/lib/db/collections"

export interface SidebarUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

// ── Nav Item ────────────────────────────────────────────

interface NavItemProps {
  href: string
  icon: LucideIcon
  label: string
  iconColor?: string
  count?: number | null
  badge?: string
  collapsed: boolean
}

function NavItem({ href, icon: Icon, label, iconColor, count, badge, collapsed }: NavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  const linkClasses = cn(
    "flex items-center gap-2.5 rounded-md h-8 text-sm transition-colors select-none",
    "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
    isActive && "bg-sidebar-accent text-sidebar-foreground font-medium",
    collapsed ? "justify-center w-8 mx-auto" : "px-2 w-full"
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={<Link href={href} className={linkClasses} />}
        >
          <Icon
            className="h-4 w-4 shrink-0"
            style={iconColor ? { color: iconColor } : undefined}
          />
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Link href={href} className={linkClasses}>
      <Icon
        className="h-4 w-4 shrink-0"
        style={iconColor ? { color: iconColor } : undefined}
      />
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sidebar-accent text-sidebar-foreground/60">
          {badge}
        </span>
      )}
      {count != null && !badge && (
        <span className="text-xs tabular-nums text-sidebar-foreground/40">{count}</span>
      )}
    </Link>
  )
}

// ── Collection Item ─────────────────────────────────────

interface CollectionItemProps {
  id: string
  name: string
  color: string
  count: number
  isFavorite: boolean
  collapsed: boolean
}

function CollectionItem({ id, name, color, count, isFavorite, collapsed }: CollectionItemProps) {
  const pathname = usePathname()
  const href = `/collections/${id}`
  const isActive = pathname === href

  const linkClasses = cn(
    "flex items-center gap-2.5 rounded-md h-8 text-sm transition-colors select-none",
    "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
    isActive && "bg-sidebar-accent text-sidebar-foreground font-medium",
    collapsed ? "justify-center w-8 mx-auto" : "px-2 w-full"
  )

  const indicator = isFavorite ? (
    <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
  ) : (
    <span
      className="h-2 w-2 rounded-full shrink-0"
      style={{ backgroundColor: color }}
    />
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={<Link href={href} className={linkClasses} />}>
          {indicator}
        </TooltipTrigger>
        <TooltipContent side="right">{name}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Link href={href} className={linkClasses}>
      {indicator}
      <span className="flex-1 truncate">{name}</span>
      <span className="text-xs tabular-nums text-sidebar-foreground/40">{count}</span>
    </Link>
  )
}

// ── Section Header ──────────────────────────────────────

function SectionHeader({
  label,
  showPlus = false,
  collapsible = false,
  isOpen = true,
  onToggle,
}: {
  label: string
  showPlus?: boolean
  collapsible?: boolean
  isOpen?: boolean
  onToggle?: () => void
}) {
  return (
    <div className="flex items-center px-2 mb-1">
      {collapsible ? (
        <button
          onClick={onToggle}
          className="flex items-center gap-1 flex-1 text-left group"
        >
          <ChevronRight
            className={cn(
              "h-3 w-3 text-sidebar-foreground/35 transition-transform duration-150",
              isOpen && "rotate-90"
            )}
          />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35 group-hover:text-sidebar-foreground/60 transition-colors">
            {label}
          </span>
        </button>
      ) : (
        <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35 flex-1">
          {label}
        </span>
      )}
      {showPlus && (
        <button
          className="flex items-center justify-center text-sidebar-foreground/35 hover:text-sidebar-foreground transition-colors"
          tabIndex={-1}
        >
          <Plus className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

// ── User Menu ───────────────────────────────────────────

function UserMenu({ user, collapsed }: { user: SidebarUser; collapsed: boolean }) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  function handleToggle() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.top, left: rect.left, width: rect.width })
    }
    setOpen((v) => !v)
  }

  function handleSignOut() {
    setOpen(false)
    signOut({ callbackUrl: "/sign-in" })
  }

  const dropdownMenu = open && menuPos && createPortal(
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: menuPos.top - 8,
        left: collapsed ? menuPos.left + 40 : menuPos.left,
        width: collapsed ? 176 : Math.max(menuPos.width, 176),
        transform: "translateY(-100%)",
        zIndex: 9999,
      }}
      className="rounded-lg border border-sidebar-border bg-popover text-popover-foreground shadow-md py-1"
    >
      <Link
        href="/profile"
        onClick={() => setOpen(false)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent transition-colors"
      >
        <User className="h-3.5 w-3.5" />
        Profile
      </Link>
      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent transition-colors text-left"
      >
        <LogOut className="h-3.5 w-3.5" />
        Sign out
      </button>
    </div>,
    document.body
  )

  const avatar = (
    <UserAvatar
      name={user.name}
      image={user.image}
      size={32}
      className="shrink-0 ring-2 ring-sidebar-border"
    />
  )

  if (collapsed) {
    return (
      <>
        <Tooltip>
          <TooltipTrigger
            render={
              <button ref={triggerRef} onClick={handleToggle} className="cursor-pointer" />
            }
          >
            {avatar}
          </TooltipTrigger>
          <TooltipContent side="right">{user.name ?? user.email}</TooltipContent>
        </Tooltip>
        {dropdownMenu}
      </>
    )
  }

  return (
    <>
      <button ref={triggerRef} onClick={handleToggle} className="cursor-pointer">
        {avatar}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate leading-tight">{user.name ?? "User"}</p>
        <p className="text-[11px] text-sidebar-foreground/50 truncate leading-tight">
          {user.email}
        </p>
      </div>
      {dropdownMenu}
    </>
  )
}

// ── Sidebar Inner ───────────────────────────────────────

function SidebarInner({
  collapsed,
  onToggleCollapse,
  itemTypes,
  collections,
  user,
}: {
  collapsed: boolean
  onToggleCollapse: () => void
  itemTypes: SidebarItemType[]
  collections: CollectionWithMeta[]
  user: SidebarUser
}) {
  const [collectionsOpen, setCollectionsOpen] = useState(true)

  const favoriteCollections = collections.filter((c) => c.isFavorite)
  const recentCollections = collections.filter((c) => !c.isFavorite)

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div
        className={cn(
          "flex items-center h-14 shrink-0 border-b border-sidebar-border",
          collapsed ? "justify-center px-3" : "px-4 gap-2.5"
        )}
      >
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={onToggleCollapse}
                  className="h-7 w-7 rounded-md bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-[11px] font-bold cursor-pointer"
                />
              }
            >
              ds
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        ) : (
          <>
            <div className="h-7 w-7 rounded-md bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-[11px] font-bold shrink-0">
              ds
            </div>
            <span className="flex-1 text-sm font-semibold tracking-tight">DevStash</span>
            <button
              onClick={onToggleCollapse}
              className="h-6 w-6 flex items-center justify-center rounded text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-2 min-h-0">
        {/* Item Types */}
        <section>
          {!collapsed && <SectionHeader label="Item Types" showPlus />}
          <div className="space-y-0.5">
            {itemTypes.map((type) => {
              const isPro = type.category === "FILE"
              return (
                <NavItem
                  key={type.id}
                  href={`/items/${type.slug}`}
                  icon={ICON_MAP[type.icon] ?? File}
                  label={type.name}
                  iconColor={type.color}
                  count={isPro ? null : type.count}
                  badge={isPro ? "PRO" : undefined}
                  collapsed={collapsed}
                />
              )
            })}
          </div>
        </section>

        {/* Collections */}
        {(favoriteCollections.length > 0 || recentCollections.length > 0) && (
          <section>
            {!collapsed && (
              <SectionHeader
                label="Collections"
                collapsible
                isOpen={collectionsOpen}
                onToggle={() => setCollectionsOpen((v) => !v)}
              />
            )}
            {collectionsOpen && (
              <div className="space-y-0.5">
                {favoriteCollections.length > 0 && (
                  <>
                    {!collapsed && (
                      <p className="px-2 pt-1 pb-0.5 text-[10px] font-medium text-sidebar-foreground/30 uppercase tracking-wider">
                        Favorites
                      </p>
                    )}
                    {favoriteCollections.map((col) => (
                      <CollectionItem
                        key={col.id}
                        id={col.id}
                        name={col.name}
                        color={col.dominantColor}
                        count={col.itemCount}
                        isFavorite
                        collapsed={collapsed}
                      />
                    ))}
                  </>
                )}
                {recentCollections.length > 0 && (
                  <>
                    {!collapsed && (
                      <p className="px-2 pt-1 pb-0.5 text-[10px] font-medium text-sidebar-foreground/30 uppercase tracking-wider">
                        Recent
                      </p>
                    )}
                    {recentCollections.map((col) => (
                      <CollectionItem
                        key={col.id}
                        id={col.id}
                        name={col.name}
                        color={col.dominantColor}
                        count={col.itemCount}
                        isFavorite={false}
                        collapsed={collapsed}
                      />
                    ))}
                  </>
                )}
                {!collapsed && (
                  <Link
                    href="/collections"
                    className="flex items-center gap-2.5 px-2 h-7 mt-1 text-xs text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors rounded-md hover:bg-sidebar-accent"
                  >
                    View all collections
                  </Link>
                )}
              </div>
            )}
          </section>
        )}
      </nav>

      {/* User area */}
      <div
        className={cn(
          "shrink-0 border-t border-sidebar-border p-3",
          collapsed ? "flex justify-center" : "flex items-center gap-2.5"
        )}
      >
        <UserMenu user={user} collapsed={collapsed} />
      </div>
    </div>
  )
}

// ── Sidebar (exported) ──────────────────────────────────

export interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
  itemTypes: SidebarItemType[]
  collections: CollectionWithMeta[]
  user: SidebarUser
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileOpenChange,
  itemTypes,
  collections,
  user,
}: SidebarProps) {
  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          "hidden md:flex flex-col shrink-0 border-r border-border overflow-hidden h-full",
          "transition-[width] duration-200 ease-in-out",
          collapsed ? "w-14" : "w-60"
        )}
      >
        <SidebarInner
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
          itemTypes={itemTypes}
          collections={collections}
          user={user}
        />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="w-60 p-0 bg-sidebar border-r border-sidebar-border"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarInner
            collapsed={false}
            onToggleCollapse={() => onMobileOpenChange(false)}
            itemTypes={itemTypes}
            collections={collections}
            user={user}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}
