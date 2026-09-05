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
import Navbar from "./Navbar"
import Sidebar from "./Sidebar"

/** Pages that sign-in should bounce away from once a session exists. */
const authPages = ["/login", "/signup"]

function FullPage({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm font-medium text-zinc-600">
      {children}
    </main>
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
    <div className="flex min-h-screen flex-col bg-white text-foreground">
      <Sidebar />
      <Navbar />
      <main
        className={`flex-1 bg-zinc-50 p-4 transition-all duration-300 sm:p-6 ${
          sidebarOpen ? "lg:ml-64" : "lg:ml-20"
        }`}
      >
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  )

  if (!canAccessPath(pathname, user?.role)) {
    return (
      <div className="flex min-h-screen flex-col bg-white text-foreground">
        <Sidebar />
        <Navbar />
        <main
          className={`flex-1 bg-zinc-50 p-4 transition-all duration-300 sm:p-6 ${
            sidebarOpen ? "lg:ml-64" : "lg:ml-20"
          }`}
        >
          <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl items-center justify-center">
            <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Access restricted
              </p>
              <h1 className="mt-2 text-xl font-semibold text-black">
                This page is not available for {labelForRole(user?.role)}
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                Use the modules in the sidebar, or ask an administrator to change
                your role.
              </p>
            </div>
          </div>
        </main>
      </div>
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
