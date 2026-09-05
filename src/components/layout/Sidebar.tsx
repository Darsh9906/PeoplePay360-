"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Layers,
  LayoutDashboard,
  ListChecks,
  PieChart,
  PlayCircle,
  Receipt,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { useApp } from "@/src/context/AppContext"
import { useAuth } from "@/src/context/AuthContext"
import { labelForRole, navigationForRole, type NavItem } from "@/src/lib/rbac"

/** Icon names referenced by the nav model in rbac.ts. */
const icons: Record<string, LucideIcon> = {
  Activity,
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  Clock,
  FileText,
  Layers,
  LayoutDashboard,
  ListChecks,
  PieChart,
  PlayCircle,
  Receipt,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  Wallet,
}

/** A nav entry is active on an exact match, or when the path sits beneath it. */
function isActive(pathname: string, item: NavItem, hasChildren: boolean) {
  if (pathname === item.href) {
    return true
  }

  // A parent with children defers highlighting to whichever child matches.
  if (hasChildren) {
    return false
  }

  return pathname.startsWith(`${item.href}/`)
}

export default function Sidebar() {
  const pathname = usePathname() ?? "/"
  const app = useApp()
  const { user } = useAuth()

  const sidebarOpen = app?.sidebarOpen ?? true
  const setSidebarOpen = app?.setSidebarOpen ?? (() => {})

  // The role decides the entire menu — nothing is rendered then hidden.
  const items = navigationForRole(user?.role)

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-zinc-800 bg-black text-white transition-all duration-300 ${
        sidebarOpen ? "w-64" : "w-20"
      }`}
    >
      {/* Workspace header */}
      <div className="flex h-16 items-center justify-between border-b border-zinc-800 px-4">
        <div className="flex items-center overflow-hidden">
          {sidebarOpen && (
            <div className="flex flex-col truncate">
              <span className="truncate text-sm font-semibold tracking-wide text-white">
                {user?.organization?.name ?? "PeoplePay360"}
              </span>
              <span className="text-[11px] text-zinc-400">HR &amp; Payroll</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 text-zinc-400 transition hover:bg-zinc-900 hover:text-white sm:flex"
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
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const Icon = icons[item.icon] ?? LayoutDashboard
          const children = item.children ?? []
          const active = isActive(pathname, item, children.length > 0)
          const sectionOpen =
            children.length > 0 &&
            (pathname === item.href || pathname.startsWith(`${item.href}/`))

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                title={sidebarOpen ? undefined : item.label}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                  active
                    ? "bg-white font-semibold text-black"
                    : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                } ${sidebarOpen ? "" : "justify-center"}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </Link>

              {/* Child routes appear once the section is open. */}
              {sidebarOpen && sectionOpen && children.length > 0 && (
                <div className="mt-1 space-y-0.5 border-l border-zinc-800 pl-3 ml-4">
                  {children.map((child) => {
                    const childActive =
                      pathname === child.href ||
                      (child.href !== item.href &&
                        pathname.startsWith(`${child.href}/`))

                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block rounded px-3 py-1.5 text-[13px] transition ${
                          childActive
                            ? "font-semibold text-white"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Signed-in identity */}
      <div className="border-t border-zinc-800 px-3 py-3">
        {sidebarOpen ? (
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold">
              {(user?.name ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">
                {user?.name ?? "Not signed in"}
              </p>
              <p className="truncate text-[11px] text-zinc-400">
                {labelForRole(user?.role)}
              </p>
            </div>
          </div>
        ) : (
          <div
            className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold"
            title={`${user?.name ?? "Not signed in"} · ${labelForRole(user?.role)}`}
          >
            {(user?.name ?? "?").charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </aside>
  )
}
