"use client"

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react"

interface AppContextType {
  sidebarOpen: boolean
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const AppContext = createContext<AppContextType | null>(null)

const mobileQuery = "(max-width: 1023px)"

function subscribe(onChange: () => void) {
  const list = window.matchMedia(mobileQuery)
  list.addEventListener("change", onChange)
  return () => list.removeEventListener("change", onChange)
}

/** Server renders the desktop layout, so the snapshot there is "not mobile". */
function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(mobileQuery).matches,
    () => false,
  )
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Below lg the sidebar overlays the page, so it keeps its own closed-by-
  // default state rather than inheriting the desktop preference.
  const isMobile = useIsMobile()
  const [desktopOpen, setDesktopOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  const value = useMemo(
    () => ({
      sidebarOpen: isMobile ? mobileOpen : desktopOpen,
      setSidebarOpen: isMobile ? setMobileOpen : setDesktopOpen,
    }),
    [desktopOpen, isMobile, mobileOpen],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    return { sidebarOpen: true, setSidebarOpen: () => {} }
  }
  return context
}
