"use client"

import React from "react"
import { usePathname, useRouter } from "next/navigation"
import { AppProvider, useApp } from "@/src/context/AppContext"
import { AuthProvider, useAuth } from "@/src/context/AuthContext"
import { PayrollProvider } from "@/src/context/PayrollContext"
import { QueryProvider } from "@/src/context/QueryProvider"
import {
  canAccessPath,
  defaultPathForRole,
  isPublicPath,
  labelForRole,
} from "@/src/lib/rbac"
import { Lock } from "lucide-react"
import Navbar from "./Navbar"
import Sidebar from "./Sidebar"

/** Pages that sign-in should bounce away from once a session exists. */
const authPages = ["/login", "/signup"]

function FullPage({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-canvas flex min-h-screen items-center justify-center text-sm font-medium text-zinc-500">
      <span className="flex items-center gap-2.5">
        <span className="h-2 w-2 animate-ping rounded-full bg-harbor-400" />
        {children}
      </span>
    </main>
  )
}

/** Sidebar + navbar + canvas. Both the normal and access-denied pages use it. */
function Shell({
  children,
  sidebarOpen,
  onDismiss,
}: {
  children: React.ReactNode
  sidebarOpen: boolean
  onDismiss: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-foreground">
      <Sidebar />
      {/* Below lg the sidebar overlays the page, so it needs a scrim. */}
      {sidebarOpen && (
        <div
          onClick={onDismiss}
          className="fixed inset-0 z-30 bg-zinc-950/25 backdrop-blur-[2px] lg:hidden"
          aria-hidden
        />
      )}
      <Navbar />
      <main
        className={`app-canvas flex-1 p-4 transition-all duration-300 sm:p-6 lg:p-8 ${
          sidebarOpen ? "lg:ml-64" : "lg:ml-20"
        }`}
      >
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  )
}

function LayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/"
  const router = useRouter()
  const app = useApp()
  const { user, isAuthenticated, isLoading } = useAuth()

  const sidebarOpen = app?.sidebarOpen ?? true
  const isPublic = isPublicPath(pathname)
  const mustChangePassword = Boolean(user?.mustChangePassword)

  React.useEffect(() => {
    if (isLoading) {
      return
    }

    // Not signed in: everything except the public pages goes to login.
    if (!isAuthenticated) {
      if (!isPublic) {
        router.replace("/login")
      }
      return
    }

    // A temporary password has to be replaced before anything else opens.
    if (mustChangePassword && pathname !== "/change-password") {
      router.replace("/change-password")
      return
    }

    // Signed in and sitting on the landing or an auth page: go to their home.
    if (!mustChangePassword && (pathname === "/" || authPages.includes(pathname))) {
      router.replace(defaultPathForRole(user?.role))
    }
  }, [
    isAuthenticated,
    isLoading,
    isPublic,
    mustChangePassword,
    pathname,
    router,
    user?.role,
  ])

  // Public pages render bare — no sidebar, no navbar.
  if (isPublic && !isAuthenticated) {
    return <>{children}</>
  }

  if (isLoading) {
    return <FullPage>Loading workspace...</FullPage>
  }

  if (!isAuthenticated) {
    return isPublic ? <>{children}</> : <FullPage>Redirecting to sign in...</FullPage>
  }

  // The forced password change renders on its own, outside the app shell.
  if (mustChangePassword) {
    return pathname === "/change-password" ? (
      <>{children}</>
    ) : (
      <FullPage>Redirecting...</FullPage>
    )
  }

  // Signed in but standing on a public/auth page while the redirect runs.
  if (isPublic) {
    return <FullPage>Opening your workspace...</FullPage>
  }

  const shell = (
    <Shell sidebarOpen={sidebarOpen} onDismiss={() => app?.setSidebarOpen?.(false)}>
      {children}
    </Shell>
  )

  if (!canAccessPath(pathname, user?.role)) {
    return (
      <Shell sidebarOpen={sidebarOpen} onDismiss={() => app?.setSidebarOpen?.(false)}>
        <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center">
          <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-card">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-warning-soft text-warning">
              <Lock className="h-5 w-5" />
            </span>
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Access restricted
            </p>
            <h1 className="mt-2 font-display text-xl font-semibold tracking-tight text-zinc-900">
              Not available for {labelForRole(user?.role)}
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-zinc-500">
              Use the modules in the sidebar, or ask an administrator to change
              your role.
            </p>
          </div>
        </div>
      </Shell>
    )
  }

  return shell
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <AppProvider>
          <PayrollProvider>
            <LayoutInner>{children}</LayoutInner>
          </PayrollProvider>
        </AppProvider>
      </AuthProvider>
    </QueryProvider>
  )
}
