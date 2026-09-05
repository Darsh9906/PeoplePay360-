"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Building2, KeyRound, Percent, Save, ShieldCheck, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

type StatutorySetting = {
  id: string
  component: "pf" | "esi" | "professional_tax" | "income_tax"
  code: string
  name: string
  rate: string | null
  fixedAmount: string | null
  effectiveFrom: string
  effectiveTo: string | null
  isActive: boolean
}

type RateField = {
  code: string
  label: string
  component: StatutorySetting["component"]
  valueType: "rate" | "fixedAmount"
  defaultValue: string
}

const roleOrder: UserRole[] = [
  "employee",
  "hr_manager",
  "payroll_user",
  "payroll_manager",
  "admin",
]

const payrollRateFields: RateField[] = [
  { code: "PF_EMPLOYEE", label: "PF Employee Rate (%)", component: "pf", valueType: "rate", defaultValue: "12" },
  { code: "EPS_RATE", label: "EPS Rate (%)", component: "pf", valueType: "rate", defaultValue: "8.33" },
  { code: "PF_EMPLOYER", label: "PF Employer Rate (%)", component: "pf", valueType: "rate", defaultValue: "3.67" },
  { code: "EDLI_RATE", label: "EDLI Rate (%)", component: "pf", valueType: "rate", defaultValue: "0.5" },
  { code: "PF_ADMIN", label: "PF Admin Rate (%)", component: "pf", valueType: "rate", defaultValue: "0.5" },
  { code: "PF_WAGE_LIMIT", label: "PF Wage Limit", component: "pf", valueType: "fixedAmount", defaultValue: "15000" },
  { code: "ESIC_EMPLOYEE", label: "ESIC Employee Rate (%)", component: "esi", valueType: "rate", defaultValue: "0.75" },
  { code: "ESIC_EMPLOYER", label: "ESIC Employer Rate (%)", component: "esi", valueType: "rate", defaultValue: "3.25" },
  { code: "ESIC_WAGE_LIMIT", label: "ESIC Wage Limit", component: "esi", valueType: "fixedAmount", defaultValue: "21000" },
  { code: "PROFESSIONAL_TAX", label: "Professional Tax", component: "professional_tax", valueType: "fixedAmount", defaultValue: "200" },
]

const defaultRateValues = Object.fromEntries(
  payrollRateFields.map((field) => [field.code, field.defaultValue]),
) as Record<string, string>

export default function Settings() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [rateValues, setRateValues] = useState<Record<string, string>>({})
  const [rateMessage, setRateMessage] = useState("")

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => apiRequest<UserRow[]>("/api/users"),
  })

  const statutoryQuery = useQuery({
    queryKey: ["statutory-settings"],
    queryFn: () => apiRequest<StatutorySetting[]>("/api/statutory-settings"),
  })

  const savedRateValues = useMemo(() => {
    const next: Record<string, string> = {}

    for (const field of payrollRateFields) {
      const saved = statutoryQuery.data?.find((setting) => setting.code === field.code)
      const value = field.valueType === "rate" ? saved?.rate : saved?.fixedAmount

      if (value !== undefined && value !== null) {
        next[field.code] = String(value)
      }
    }

    return next
  }, [statutoryQuery.data])

  const displayedRateValues = {
    ...defaultRateValues,
    ...savedRateValues,
    ...rateValues,
  }

  const saveRatesMutation = useMutation({
    mutationFn: async () => {
      const existing = statutoryQuery.data ?? []

      await Promise.all(
        payrollRateFields.map((field) => {
          const saved = existing.find((setting) => setting.code === field.code)
          const numericValue = Number(displayedRateValues[field.code] || 0)
          const payload = {
            component: field.component,
            code: field.code,
            name: field.label,
            rate: field.valueType === "rate" ? numericValue : null,
            fixedAmount: field.valueType === "fixedAmount" ? numericValue : null,
            effectiveFrom: "2026-04-01",
            effectiveTo: null,
            isActive: true,
          }

          return saved
            ? apiRequest(`/api/statutory-settings/${saved.id}`, {
                method: "PATCH",
                body: JSON.stringify(payload),
              })
            : apiRequest("/api/statutory-settings", {
                method: "POST",
                body: JSON.stringify(payload),
              })
        }),
      )
    },
    onSuccess: async () => {
      setRateMessage("Payroll rates saved.")
      await queryClient.invalidateQueries({ queryKey: ["statutory-settings"] })
      setTimeout(() => setRateMessage(""), 1800)
    },
    onError: (error: Error) => setRateMessage(error.message),
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

      {/* Payroll rates */}
      <div className="rounded-xl border border-zinc-300 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-zinc-400" />
            <div>
              <h2 className="text-sm font-bold text-black">Payroll Rates</h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Configure statutory defaults used by payroll calculations.
              </p>
            </div>
          </div>
          <Button
            onClick={() => saveRatesMutation.mutate()}
            disabled={saveRatesMutation.isPending || statutoryQuery.isLoading}
            className="self-start gap-2 sm:self-auto"
          >
            <Save className="h-4 w-4" />
            {saveRatesMutation.isPending ? "Saving..." : "Save Rates"}
          </Button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {payrollRateFields.map((field) => (
            <div key={field.code} className="space-y-1.5">
              <label
                htmlFor={`rate-${field.code}`}
                className="text-xs font-semibold text-zinc-600"
              >
                {field.label}
              </label>
              <Input
                id={`rate-${field.code}`}
                type="number"
                step="0.01"
                min="0"
                value={displayedRateValues[field.code] ?? ""}
                onChange={(event) => {
                  setRateValues((current) => ({
                    ...current,
                    [field.code]: event.target.value,
                  }))
                  setRateMessage("")
                }}
              />
            </div>
          ))}
        </div>

        {rateMessage && (
          <p className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700">
            {rateMessage}
          </p>
        )}
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
            New accounts receive a temporary password from the admin and must
            replace it on first sign-in.
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
