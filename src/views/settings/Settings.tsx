"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Building2, KeyRound, ShieldCheck, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/src/context/AuthContext"
import { apiRequest } from "@/src/lib/api"
import { navigation, roleLabels, type UserRole } from "@/src/lib/rbac"

type UserRow = { id: string; role: UserRole; status: string }

const roleOrder: UserRole[] = [
  "employee",
  "hr_manager",
  "payroll_user",
  "payroll_manager",
  "admin",
]

export default function Settings() {
  const { user } = useAuth()

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => apiRequest<UserRow[]>("/api/users"),
  })

  const users = usersQuery.data ?? []

  const countByRole = roleOrder.map((role) => ({
    role,
    count: users.filter((item) => item.role === role).length,
  }))

  // Top-level modules each role can open, straight from the nav model.
  const moduleAccess = roleOrder.map((role) => ({
    role,
    modules: navigation
      .filter((item) => item.roles.includes(role))
      .map((item) => item.label),
  }))

  return (
    <div className="space-y-6">
      <header className="border-b border-zinc-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-black">Settings</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Workspace details and what each role can reach.
        </p>
      </header>

      {/* Workspace */}
      <div className="rounded-xl border border-zinc-300 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-bold text-black">Workspace</h2>
        </div>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Organization", value: user?.organization?.name ?? "—" },
            { label: "Workspace ID", value: user?.organization?.slug ?? "—" },
            { label: "Currency", value: user?.organization?.currency ?? "INR" },
            { label: "Total accounts", value: String(users.length) },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                {item.label}
              </p>
              <p className="mt-1 text-sm font-medium text-black">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Accounts per role */}
      <div className="rounded-xl border border-zinc-300 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm font-bold text-black">Accounts by role</h2>
          </div>
          <Link href="/users">
            <Button variant="outline" className="text-xs">
              Manage users
            </Button>
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {countByRole.map((item) => (
            <div
              key={item.role}
              className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
            >
              <p className="text-lg font-bold tabular-nums text-black">
                {item.count}
              </p>
              <p className="text-[11px] leading-tight text-zinc-500">
                {roleLabels[item.role]}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Role matrix */}
      <div className="overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-zinc-200 p-4">
          <ShieldCheck className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-bold text-black">Role permissions</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 bg-zinc-50">
              <TableHead className="font-semibold text-black">Role</TableHead>
              <TableHead className="font-semibold text-black">
                Modules they can open
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {moduleAccess.map((item) => (
              <TableRow key={item.role} className="border-zinc-200">
                <TableCell className="whitespace-nowrap font-semibold text-black">
                  {roleLabels[item.role]}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {item.modules.map((moduleName) => (
                      <Badge key={moduleName} variant="outline">
                        {moduleName}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
          Permissions are enforced on the server as well as in this menu, so a
          hidden module cannot be reached by typing its address.
        </div>
      </div>

      {/* Security */}
      <div className="rounded-xl border border-zinc-300 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-bold text-black">Security</h2>
        </div>
        <ul className="mt-3 space-y-2 text-sm text-zinc-600">
          <li>
            New accounts receive a temporary password by email and must replace it
            on first sign-in.
          </li>
          <li>
            Changing a password signs out every other device for that account.
          </li>
          <li>Sessions expire seven days after sign-in.</li>
        </ul>
        <Link href="/change-password" className="mt-4 inline-block">
          <Button variant="outline" className="text-xs">
            Change my password
          </Button>
        </Link>
      </div>
    </div>
  )
}
