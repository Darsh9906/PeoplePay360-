"use client"

import React from "react"
import { usePathname } from "next/navigation"
import { AppProvider, useApp } from "@/src/context/AppContext"
import { AuthProvider } from "@/src/context/AuthContext"
import Sidebar from "./Sidebar"
import Navbar from "./Navbar"

function LayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const app = useApp()
  const sidebarOpen = app?.sidebarOpen ?? true

  if (pathname === "/login") return <>{children}</>

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
    <AuthProvider>
      <AppProvider>
        <LayoutInner>{children}</LayoutInner>
      </AppProvider>
    </AuthProvider>
  )
}
