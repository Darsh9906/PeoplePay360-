"use client"

import { useApp } from "@/src/context/AppContext"
import Link from "next/link"
import { Menu, Bell, LogIn, Search } from "lucide-react"

export default function Navbar() {
  const app = useApp()
  const sidebarOpen = app?.sidebarOpen ?? true
  const setSidebarOpen = app?.setSidebarOpen ?? (() => {})

  return (
    <header
      className={`sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 sm:px-6 transition-all duration-300 ${
        sidebarOpen ? "lg:ml-64" : "lg:ml-20"
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 hover:text-black hover:bg-zinc-100 transition sm:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-black bg-white border border-zinc-300 px-2 py-1 rounded-sm">
            HR Operations
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search..."
            className="h-9 w-full rounded-md border border-zinc-300 bg-white pl-9 pr-3 text-xs text-black placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-black"
            readOnly
          />
        </div>

        <button className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 hover:text-black hover:bg-zinc-50 transition relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-black" />
        </button>

        <Link
          href="/login"
          className="flex h-9 items-center gap-2 rounded-md border border-zinc-300 bg-black px-3 text-xs font-semibold text-white transition hover:bg-zinc-800"
        >
          <LogIn className="h-4 w-4" />
          <span className="hidden sm:inline">Login</span>
        </Link>

        <div className="flex items-center gap-2 border-l border-zinc-200 pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-black text-white font-bold text-xs border border-black">
            DD
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold leading-none text-black">Dhrumil</span>
            <span className="text-[10px] text-zinc-500 leading-tight">
              HR Manager
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
