"use client"

import { createContext, useContext } from "react"

export interface CollectionOption {
  id: string
  name: string
}

const CollectionOptionsContext = createContext<CollectionOption[]>([])

/**
 * Makes the user's collections available to the item forms. `DashboardShell`
 * already receives them for the sidebar, and both the top bar's create dialog
 * and the drawer render inside it, so this avoids threading them through every
 * page and grid.
 */
export function CollectionOptionsProvider({
  collections,
  children,
}: {
  collections: CollectionOption[]
  children: React.ReactNode
}) {
  return (
    <CollectionOptionsContext.Provider value={collections}>
      {children}
    </CollectionOptionsContext.Provider>
  )
}

export function useCollectionOptions(): CollectionOption[] {
  return useContext(CollectionOptionsContext)
}
