"use client"

import { useState } from "react"
import { Sidebar, type SidebarUser } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"
import type { SidebarItemType } from "@/lib/db/items"
import type { CollectionWithMeta } from "@/lib/db/collections"

interface DashboardShellProps {
  children: React.ReactNode
  itemTypes: SidebarItemType[]
  collections: CollectionWithMeta[]
  user: SidebarUser
}

export function DashboardShell({ children, itemTypes, collections, user }: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
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
        <TopBar onMobileMenuClick={() => setMobileSidebarOpen(true)} />
        {children}
      </div>
    </div>
  )
}
