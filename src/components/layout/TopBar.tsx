"use client"

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { CreateCollectionDialog } from "@/components/collections/CreateCollectionDialog";
import { CreateItemDialog } from "@/components/items/CreateItemDialog";
import type { SearchItem, SidebarItemType } from "@/lib/db/items";
import type { CollectionWithMeta } from "@/lib/db/collections";

interface TopBarProps {
  itemTypes: SidebarItemType[]
  searchItems: SearchItem[]
  collections: CollectionWithMeta[]
  onMobileMenuClick?: () => void
}

export function TopBar({ itemTypes, searchItems, collections, onMobileMenuClick }: TopBarProps) {
  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-border shrink-0">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8"
          onClick={onMobileMenuClick}
        >
          <Menu className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold tracking-tight">DevStash</span>
      </div>

      <div className="flex-1 min-w-0 max-w-sm mx-8">
        <GlobalSearch items={searchItems} collections={collections} />
      </div>

      <div className="flex items-center gap-2">
        <CreateCollectionDialog />
        <CreateItemDialog itemTypes={itemTypes} />
      </div>
    </header>
  );
}
