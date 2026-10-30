"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { File, FolderOpen, Search } from "lucide-react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { ItemDrawer } from "@/components/items/ItemDrawer"
import { ICON_MAP } from "@/lib/icons"
import { paletteFilter } from "@/lib/search"
import type { SearchItem } from "@/lib/db/items"
import type { CollectionWithMeta } from "@/lib/db/collections"

interface GlobalSearchProps {
  items: SearchItem[]
  collections: CollectionWithMeta[]
}

/**
 * The top bar's search box and the Cmd/Ctrl+K command palette it opens.
 *
 * Search runs entirely on the client over data the shell layout already
 * fetched. The item drawer has no URL — each grid owns its own — so the
 * palette mounts its own drawer and opens the chosen item on the current page.
 */
export function GlobalSearch({ items, collections }: GlobalSearchProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [drawerItemId, setDrawerItemId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        // Some browsers bind Ctrl+K to the address bar.
        event.preventDefault()
        setOpen((value) => !value)
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  function selectItem(id: string) {
    setOpen(false)
    setDrawerItemId(id)
    setDrawerOpen(true)
  }

  function selectCollection(id: string) {
    setOpen(false)
    router.push(`/collections/${id}`)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-full items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 truncate">Search snippets, prompts, commands...</span>
        <kbd className="ml-auto hidden shrink-0 rounded border border-border bg-background px-1.5 font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Search your items and collections"
      >
        <Command filter={paletteFilter}>
          <CommandInput placeholder="Search items and collections..." />
          <CommandList className="max-h-[min(24rem,60vh)]">
            <CommandEmpty>No results found.</CommandEmpty>

            {items.length > 0 && (
              <CommandGroup heading="Items">
                {items.map((item) => {
                  const Icon = ICON_MAP[item.type.icon] ?? File
                  return (
                    <CommandItem
                      key={item.id}
                      value={`item-${item.id}`}
                      keywords={[item.title, item.type.name, item.preview ?? ""]}
                      onSelect={() => selectItem(item.id)}
                    >
                      <Icon style={{ color: item.type.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{item.title}</p>
                        {item.preview && (
                          <p className="truncate text-xs text-muted-foreground">{item.preview}</p>
                        )}
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}

            {collections.length > 0 && (
              <CommandGroup heading="Collections">
                {collections.map((collection) => (
                  <CommandItem
                    key={collection.id}
                    value={`collection-${collection.id}`}
                    keywords={[collection.name]}
                    onSelect={() => selectCollection(collection.id)}
                  >
                    <FolderOpen className="text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{collection.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {collection.itemCount} {collection.itemCount === 1 ? "item" : "items"}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>

      <ItemDrawer itemId={drawerItemId} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  )
}
