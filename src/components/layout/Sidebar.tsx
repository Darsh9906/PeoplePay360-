"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useApp } from "@/src/context/AppContext"
import {
  Users,
  FileText,
  LayoutDashboard,
  Calendar,
  Clock,
  DollarSign,
  Briefcase,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react"

export default function Sidebar() {
  const pathname = usePathname()
  const app = useApp()
  const sidebarOpen = app?.sidebarOpen ?? true
  const setSidebarOpen = app?.setSidebarOpen ?? (() => {})

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Employees", href: "/employees", icon: Users, badge: "HR Ops" },
    { label: "Contracts", href: "/contracts", icon: FileText, badge: "HR Ops" },
    { label: "Attendance", href: "/attendance", icon: Clock },
    { label: "Time Off", href: "/timeoff", icon: Calendar },
    { label: "Payroll", href: "#", icon: DollarSign, disabled: true },
    { label: "Schedules", href: "/schedules", icon: Briefcase },
    { label: "User Management", href: "/users", icon: Users },
    { label: "Settings", href: "#", icon: Settings, disabled: true },
  ]

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen transition-all duration-300 bg-black text-white border-r border-zinc-800 flex flex-col ${
        sidebarOpen ? "w-64" : "w-20"
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-zinc-800">
        <div className="flex items-center overflow-hidden">
          {sidebarOpen && (
            <div className="flex flex-col truncate">
              <span className="font-semibold text-sm tracking-wide text-white">
                PeoplePay360
              </span>
              <span className="text-[11px] text-zinc-400">HR & Payroll Suite</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden sm:flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-900 transition border border-zinc-800"
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            item.href !== "#" &&
            (pathname === item.href ||
              (item.href !== "/" && pathname?.startsWith(item.href)))

          if (item.disabled) {
            return (
              <div
                key={item.label}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium text-zinc-600 cursor-not-allowed select-none ${
                  !sidebarOpen && "justify-center px-0"
                }`}
                title={`${item.label} (Out of scope)`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {sidebarOpen && (
                  <div className="flex-1 flex items-center justify-between">
                    <span>{item.label}</span>
                    <span className="text-[10px] bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded-sm text-zinc-500">
                      Soon
                    </span>
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
              } ${!sidebarOpen && "justify-center px-0"}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {sidebarOpen && (
                <div className="flex-1 flex items-center justify-between">
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-normal ${
                        isActive
                          ? "bg-black text-white border border-zinc-700"
                          : "bg-zinc-950 text-zinc-300 border border-zinc-800"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          )
        })}
      </div>

      {/* Footer Info */}
      {sidebarOpen && (
        <div className="p-3 m-3 rounded-md bg-zinc-950 border border-zinc-800 text-xs">
          <div className="flex items-center gap-2 text-zinc-200 font-medium mb-1">
            <Shield className="h-3.5 w-3.5" />
            <span>Frontend Task Mode</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-tight">
            Employee List &amp; Contracts modules.
          </p>
        </div>
      )}
    </aside>
  )
}
