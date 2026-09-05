export type UserRole =
  | "employee"
  | "hr_manager"
  | "payroll_user"
  | "payroll_manager"
  | "admin"

export const roleLabels: Record<UserRole, string> = {
  employee: "Employee",
  hr_manager: "HR Manager",
  payroll_user: "HR Payroll User",
  payroll_manager: "HR Payroll Manager",
  admin: "Admin",
}

/** Role groups, each widening the one before it. */
const HR = ["hr_manager", "payroll_user", "payroll_manager", "admin"] as const
const PAYROLL = ["payroll_user", "payroll_manager", "admin"] as const
const PAYROLL_ADMIN = ["payroll_manager", "admin"] as const
const ADMIN = ["admin"] as const

export type NavItem = {
  label: string
  href: string
  /** Lucide icon name, resolved to a component in the sidebar. */
  icon: string
  roles: readonly UserRole[]
  children?: NavItem[]
}

/**
 * Single source of truth for navigation and route access.
 *
 * Declaration order sets the sidebar order only. Access matches the longest
 * href first, so a child route can be narrower than its parent.
 */
export const navigation: NavItem[] = [
  // ---- Employee self-service ----
  { label: "My Profile", href: "/me", icon: "UserRound", roles: ["employee"] },
  { label: "My Attendance", href: "/me/attendance", icon: "Clock", roles: ["employee"] },
  { label: "My Time Off", href: "/me/timeoff", icon: "CalendarDays", roles: ["employee"] },

  // ---- HR ----
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", roles: HR },
  { label: "Employees", href: "/employees", icon: "Users", roles: HR },
  { label: "Contracts", href: "/contracts", icon: "FileText", roles: HR },
  { label: "Working Schedules", href: "/schedules", icon: "CalendarClock", roles: HR },
  { label: "Attendance", href: "/attendance", icon: "Clock", roles: HR },
  { label: "Time Off", href: "/timeoff", icon: "CalendarDays", roles: HR },

  // ---- Payroll ----
  {
    label: "Payroll",
    href: "/payroll",
    icon: "Wallet",
    roles: PAYROLL,
    children: [
      { label: "Payroll Dashboard", href: "/payroll", icon: "PieChart", roles: PAYROLL },
      { label: "Payruns", href: "/payroll/payruns", icon: "PlayCircle", roles: PAYROLL },
      { label: "Payslips", href: "/payroll/payslips", icon: "Receipt", roles: PAYROLL },
      // Salary configuration is payroll manager and above.
      { label: "Salary Structures", href: "/payroll/structures", icon: "Layers", roles: PAYROLL_ADMIN },
      { label: "Salary Rules", href: "/payroll/rules", icon: "ListChecks", roles: PAYROLL_ADMIN },
      { label: "Payroll Health", href: "/payroll/health", icon: "Activity", roles: PAYROLL_ADMIN },
      { label: "Anomalies", href: "/payroll/anomalies", icon: "AlertTriangle", roles: PAYROLL_ADMIN },
    ],
  },

  // ---- Administration ----
  { label: "Users & Roles", href: "/users", icon: "ShieldCheck", roles: ADMIN },
  { label: "Settings", href: "/settings", icon: "Settings", roles: ADMIN },
]

/** Reachable without a session. */
const publicPaths = ["/", "/login", "/signup"]

/** Signed in but not yet cleared for anything else. */
const alwaysAllowedWhenSignedIn = ["/change-password"]

/** Flattened nav, longest href first so nested routes beat their parent. */
const routeTable: { href: string; roles: readonly UserRole[] }[] = navigation
  .flatMap((item) => [item, ...(item.children ?? [])])
  .map((item) => ({ href: item.href, roles: item.roles }))
  .sort((a, b) => b.href.length - a.href.length)

export function isUserRole(role?: string | null): role is UserRole {
  return Boolean(role && role in roleLabels)
}

export function isPublicPath(pathname: string) {
  return publicPaths.includes(pathname)
}

export function canAccessPath(pathname: string, role?: string | null) {
  if (isPublicPath(pathname)) {
    return true
  }

  if (!isUserRole(role)) {
    return false
  }

  if (alwaysAllowedWhenSignedIn.includes(pathname)) {
    return true
  }

  const match = routeTable.find(
    (route) => pathname === route.href || pathname.startsWith(`${route.href}/`),
  )

  return match ? match.roles.includes(role) : false
}

/** Nav tree filtered to what this role may actually open. */
export function navigationForRole(role?: string | null): NavItem[] {
  if (!isUserRole(role)) {
    return []
  }

  return navigation
    .filter((item) => item.roles.includes(role))
    .map((item) => ({
      ...item,
      children: item.children?.filter((child) => child.roles.includes(role)),
    }))
}

/** Where a role lands after signing in. */
export function defaultPathForRole(role?: string | null) {
  if (!isUserRole(role)) {
    return "/login"
  }

  return navigationForRole(role)[0]?.href ?? "/login"
}

export function labelForRole(role?: string | null) {
  return isUserRole(role) ? roleLabels[role] : "User"
}
