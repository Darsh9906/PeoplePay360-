"use client"

import React from "react"
import { usePathname, useRouter } from "next/navigation"
import { AppProvider, useApp } from "@/src/context/AppContext"
import { AuthProvider, useAuth } from "@/src/context/AuthContext"
import { QueryProvider } from "@/src/context/QueryProvider"
import Sidebar from "./Sidebar"
import Navbar from "./Navbar"
import { canAccessPath, defaultPathForRole, labelForRole } from "@/src/lib/rbac"

import { PayrollProvider } from "@/src/context/PayrollContext"

function LayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const currentPath = pathname ?? "/"
  const router = useRouter()
  const app = useApp()
  const { user, isAuthenticated, isLoading } = useAuth()
  const sidebarOpen = app?.sidebarOpen ?? true

  React.useEffect(() => {
    if (currentPath === "/login") return
    if (isLoading) return

    if (!isAuthenticated) {
      router.replace("/login")
      return
    }

    if (currentPath === "/") {
      router.replace(defaultPathForRole(user?.role))
    }
  }, [currentPath, isAuthenticated, isLoading, router, user?.role])

  if (currentPath === "/login") return <>{children}</>

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm font-medium text-zinc-600">
        Loading workspace...
      </main>
    )
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm font-medium text-zinc-600">
        Redirecting to login...
      </main>
    )
  }

  if (!canAccessPath(currentPath, user?.role)) {
    return (
      <div className="min-h-screen bg-white text-foreground flex flex-col">
        <Sidebar />
        <Navbar />
        <main
          className={`flex-1 p-4 sm:p-6 transition-all duration-300 bg-zinc-50 ${
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
                Use the modules available in the sidebar for your assigned role.
              </p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-foreground flex flex-col">
      <Sidebar />
      <Navbar />
      <main
        className={`flex-1 p-4 sm:p-6 transition-all duration-300 bg-zinc-50 ${
          sidebarOpen ? "lg:ml-64" : "lg:ml-20"
        }`}
      >
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  )
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
