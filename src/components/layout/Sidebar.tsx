"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  AlertTriangle,
  Briefcase,
  Calendar,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
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
import { useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/src/lib/api"
import { useApp } from "@/src/context/AppContext"
import { useAuth } from "@/src/context/AuthContext"
import { LogoMark } from "@/src/components/brand/Logo"
import { navigationForRole, type NavItem } from "@/src/lib/rbac"

/** Icon names referenced by the nav model in rbac.ts. */
const icons: Record<string, LucideIcon> = {
  Activity,
  AlertTriangle,
  Briefcase,
  Calendar,
  CalendarClock,
  CalendarDays,
  Clock,
  DollarSign,
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

/**
 * The single nav href the current path belongs to: the longest one that either
 * matches exactly or is a parent segment of it.
 *
 * Matching each entry independently lit up more than one row — "/me" is a
 * prefix of "/me/attendance", so My Profile stayed highlighted while My
 * Attendance was open. Only the most specific match wins.
 */
function activeHrefFor(pathname: string, items: NavItem[]) {
  return items
    .flatMap((item) => [item.href, ...(item.children ?? []).map((child) => child.href)])
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0]
}

export default function Sidebar() {
  const pathname = usePathname() ?? "/"
  const app = useApp()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const sidebarOpen = app?.sidebarOpen ?? true
  const setSidebarOpen = app?.setSidebarOpen ?? (() => {})

  const handlePrefetch = (href: string) => {
    if (href === "/employees") {
      queryClient.prefetchQuery({ queryKey: ["employees"], queryFn: () => apiRequest("/api/employees") })
    } else if (href === "/attendance") {
      queryClient.prefetchQuery({ queryKey: ["attendance"], queryFn: () => apiRequest("/api/attendance") })
    } else if (href === "/me/attendance") {
      queryClient.prefetchQuery({ queryKey: ["my-attendance"], queryFn: () => apiRequest("/api/attendance") })
    } else if (href === "/schedules") {
      queryClient.prefetchQuery({ queryKey: ["schedules"], queryFn: () => apiRequest("/api/schedules") })
      queryClient.prefetchQuery({ queryKey: ["employee-schedules"], queryFn: () => apiRequest("/api/employee-schedules") })
    } else if (href.startsWith("/payroll")) {
      queryClient.prefetchQuery({ queryKey: ["payruns"], queryFn: () => apiRequest("/api/payruns") })
    }
  }

  // The role decides the entire menu — nothing is rendered then hidden.
  const items = navigationForRole(user?.role)
  const activeHref = activeHrefFor(pathname, items)

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-zinc-200 bg-white transition-all duration-300 lg:translate-x-0 ${
        sidebarOpen ? "w-64 translate-x-0" : "w-20 -translate-x-full"
      }`}
    >
      {/* Workspace header */}
      <div
        className={`flex h-16 shrink-0 items-center border-b border-zinc-100 ${
          sidebarOpen ? "justify-between px-4" : "justify-center px-2"
        }`}
      >
        {/* Mark only. The workspace name stays reachable as a tooltip so a
            multi-tenant user can still tell which one they are in. */}
        <div
          className="flex min-w-0 items-center"
          title={user?.organization?.name ?? "PeoplePay360"}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-harbor-800 text-white">
            <LogoMark className="h-5 w-5" />
          </span>
        </div>
        {sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:bg-harbor-50 hover:text-harbor-800 sm:flex"
            title="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="mx-auto mt-3 hidden h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:bg-harbor-50 hover:text-harbor-800 sm:flex"
          title="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Navigation */}
      <nav className="scroll-slim flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {items.map((item, index) => {
          const Icon = icons[item.icon] ?? LayoutDashboard
          const children = item.children ?? []
          // A parent with children defers the highlight to the matching child.
          const active = children.length === 0 && item.href === activeHref
          const sectionOpen =
            children.length > 0 &&
            (pathname === item.href || pathname.startsWith(`${item.href}/`))
          const startsSection =
            Boolean(item.section) && item.section !== items[index - 1]?.section

          return (
            <div key={item.href}>
              {startsSection && sidebarOpen && (
                <p
                  className={`px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 ${
                    index === 0 ? "pt-0" : "pt-4"
                  }`}
                >
                  {item.section}
                </p>
              )}
              {startsSection && !sidebarOpen && index > 0 && (
                <div className="my-2.5 border-t border-zinc-100" />
              )}

              <Link
                href={item.href}
                onMouseEnter={() => handlePrefetch(item.href)}
                title={sidebarOpen ? undefined : item.label}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all duration-200 ${
                  active
                    ? "bg-harbor-800 font-semibold text-white shadow-[0_6px_16px_-8px_rgba(22,69,106,0.9)]"
                    : "text-zinc-600 hover:bg-harbor-50 hover:text-harbor-800"
                } ${sidebarOpen ? "" : "justify-center"}`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </Link>

              {/* Child routes appear once the section is open. */}
              {sidebarOpen && sectionOpen && children.length > 0 && (
                <div className="ml-[1.4rem] mt-1 space-y-0.5 border-l border-zinc-200 pl-3">
                  {children.map((child) => {
                    const childActive = child.href === activeHref

                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onMouseEnter={() => handlePrefetch(child.href)}
                        className={`relative block rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
                          childActive
                            ? "font-semibold text-harbor-800 before:absolute before:-left-[13px] before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-harbor-500"
                            : "text-zinc-500 hover:text-harbor-800"
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
    </aside>
  )
}
