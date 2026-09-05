"use client"

import Link from "next/link"
import { Mail, User, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Employee } from "@/src/types/hr"

function initials(employee: Employee) {
  return `${employee.firstName?.[0] ?? ""}${employee.lastName?.[0] ?? ""}`.toUpperCase()
}

/**
 * Kanban view of the employee master, grouped by department. Cards open the
 * same Employee form as the list view.
 */
export default function EmployeeKanban({
  employees,
}: {
  employees: Employee[]
}) {
  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white py-20 text-zinc-500 shadow-sm">
        <XCircle className="h-10 w-10 text-zinc-300" />
        <p className="text-base font-semibold text-black">No employees found</p>
        <p className="max-w-sm text-center text-xs text-zinc-500">
          There are no employee records matching the current filters.
        </p>
      </div>
    )
  }

  const byDepartment = new Map<string, Employee[]>()

  for (const employee of employees) {
    const key = employee.department || "Unassigned"
    byDepartment.set(key, [...(byDepartment.get(key) ?? []), employee])
  }

  const columns = [...byDepartment.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {columns.map(([department, members]) => (
        <section
          key={department}
          className="rounded-xl border border-zinc-300 bg-zinc-50 shadow-sm"
        >
          <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
            <h3 className="text-sm font-bold text-black">{department}</h3>
            <Badge variant="outline">{members.length}</Badge>
          </header>

          <div className="space-y-2 p-3">
            {members.map((employee) => (
              <Link
                key={employee.id}
                href={`/employees/${employee.id}`}
                className="block rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition hover:border-zinc-400 hover:shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-xs font-bold text-black">
                    {initials(employee) || <User className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-black">
                        {employee.firstName} {employee.lastName}
                      </p>
                      <Badge
                        variant={
                          employee.status === "Active" ? "active" : "inactive"
                        }
                      >
                        {employee.status}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-zinc-600">
                      {employee.position}
                    </p>
                    <p className="mt-1 flex items-center gap-1 truncate font-mono text-[11px] text-zinc-500">
                      <Mail className="h-3 w-3 shrink-0" />
                      {employee.email}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-zinc-400">
                      {employee.employeeCode}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
