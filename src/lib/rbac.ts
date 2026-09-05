export type UserRole =
  | "employee"
  | "hr_manager"
  | "payroll_user"
  | "payroll_manager"
  | "admin"

const roleAccess: Record<UserRole, string[]> = {
  admin: [
    "/dashboard",
    "/employees",
    "/contracts",
    "/attendance",
    "/timeoff",
    "/payroll",
    "/schedules",
    "/users",
  ],
  hr_manager: [
    "/dashboard",
    "/employees",
    "/contracts",
    "/attendance",
    "/timeoff",
    "/schedules",
  ],
  payroll_manager: ["/dashboard", "/employees", "/contracts", "/payroll"],
  payroll_user: ["/dashboard", "/payroll"],
  employee: ["/timeoff", "/attendance", "/employees"],
}

export const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  hr_manager: "HR Manager",
  payroll_user: "Payroll User",
  payroll_manager: "Payroll Manager",
  employee: "Employee",
}

export function canAccessPath(pathname: string, role?: string) {
  if (pathname === "/login") return true
  if (!role || !isUserRole(role)) return false

  const normalizedPath = pathname === "/" ? "/dashboard" : pathname
  return roleAccess[role].some((path) => {
    return normalizedPath === path || normalizedPath.startsWith(`${path}/`)
  })
}

export function defaultPathForRole(role?: string) {
  if (!role || !isUserRole(role)) return "/login"
  return roleAccess[role][0] ?? "/dashboard"
}

export function isUserRole(role: string): role is UserRole {
  return role in roleAccess
}

export function labelForRole(role?: string) {
  return role && isUserRole(role) ? roleLabels[role] : "User"
}
