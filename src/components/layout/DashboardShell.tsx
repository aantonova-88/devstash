"use client"

import { useState } from "react"
import { Sidebar, type SidebarUser } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"
import { CollectionOptionsProvider } from "@/components/collections/CollectionOptions"
import type { SearchItem, SidebarItemType } from "@/lib/db/items"
import type { CollectionWithMeta } from "@/lib/db/collections"

interface DashboardShellProps {
  children: React.ReactNode
  itemTypes: SidebarItemType[]
  collections: CollectionWithMeta[]
  searchItems: SearchItem[]
  user: SidebarUser
}

export function DashboardShell({
  children,
  itemTypes,
  collections,
  searchItems,
  user,
}: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <CollectionOptionsProvider collections={collections}>
      <div className="flex h-full overflow-hidden">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          mobileOpen={mobileSidebarOpen}
          onMobileOpenChange={setMobileSidebarOpen}
          itemTypes={itemTypes}
          collections={collections}
          user={user}
        />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <TopBar
            itemTypes={itemTypes}
            searchItems={searchItems}
            collections={collections}
            onMobileMenuClick={() => setMobileSidebarOpen(true)}
          />
          {children}
        </div>
      </div>
    </CollectionOptionsProvider>
  )
}
