"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  Clock,
  FileText,
  Loader2,
  Users,
  Wallet,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import BarChart from "@/src/components/charts/BarChart"
import TrendChart from "@/src/components/charts/TrendChart"
import { compactINR, formatINR, monthLabel } from "@/src/lib/format"
import { apiRequest } from "@/src/lib/api"

type DashboardData = {
  payroll: {
    totalNetPay: string
    totalGrossPay: string
    totalDeductions: string
    payslipCount: number
    averageNetPay: string
  }
  headcount: { totalEmployees: number; activeEmployees: number }
  attendance: {
    presentDays: number
    lateDays: number
    absentDays: number
    halfDays: number
    missingCheckouts: number
    totalRecords: number
    overtimeHours: string
    attendanceHealth: number
  }
  timeOff: {
    approved: number
    pending: number
    refused: number
    approvedDays: string
  }
  leaveBalances: {
    typeName: string
    allocated: string
    taken: string
    remaining: string
  }[]
  warnings: { total: number; byCode: { code: string; count: number }[] }
  recentPayruns: {
    id: string
    name: string
    periodStart: string
    periodEnd: string
    status: string
    payslipCount: number
    totalNet: string
  }[]
  departmentCosts: {
    departmentId: string
    department: string
    headcount: number
    netPay: string
    grossPay: string
  }[]
  monthlyTrend: {
    month: string
    netPay: string
    grossPay: string
    payslipCount: number
  }[]
  alerts: {
    missingBankDetails: number
    employeesWithoutContract: number
    expiringContracts: number
  }
}

type Department = { id: string; name: string }

export default function PayrollDashboard() {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [employeeType, setEmployeeType] = useState("all")

  const departmentsQuery = useQuery({
    queryKey: ["departments"],
    queryFn: () => apiRequest<Department[]>("/api/departments"),
  })

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", from, to, departmentId, employeeType],
    queryFn: () => {
      const params = new URLSearchParams()
      if (from) params.set("from", from)
      if (to) params.set("to", to)
      if (departmentId) params.set("departmentId", departmentId)
      if (employeeType !== "all") params.set("employeeType", employeeType)
      const query = params.toString()
      return apiRequest<DashboardData>(`/api/dashboard${query ? `?${query}` : ""}`)
    },
  })

  const data = dashboardQuery.data
  const hasFilters = Boolean(from || to || departmentId || employeeType !== "all")

  const departmentBars = useMemo(
    () =>
      (data?.departmentCosts ?? [])
        .filter((row) => Number(row.netPay) > 0 || row.headcount > 0)
        .map((row) => ({
          label: row.department,
          value: Number(row.netPay),
          meta: `${row.headcount} employee${row.headcount === 1 ? "" : "s"} · gross ${formatINR(Number(row.grossPay))}`,
        })),
    [data?.departmentCosts],
  )

  const trendPoints = useMemo(
    () =>
      (data?.monthlyTrend ?? []).map((row) => ({
        label: monthLabel(row.month),
        value: Number(row.netPay),
        meta: `${row.payslipCount} payslip${row.payslipCount === 1 ? "" : "s"}`,
      })),
    [data?.monthlyTrend],
  )

  if (dashboardQuery.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading payroll dashboard...
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-zinc-300 bg-white p-10 text-center">
        <p className="text-sm font-semibold text-black">
          Could not load the dashboard
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Check the API connection and try again.
        </p>
      </div>
    )
  }

  const kpis = [
    {
      label: "Total net salary",
      value: formatINR(Number(data.payroll.totalNetPay)),
      hint: `Gross ${formatINR(Number(data.payroll.totalGrossPay))}`,
      icon: Wallet,
    },
    {
      label: "Payslips generated",
      value: String(data.payroll.payslipCount),
      hint: `${data.headcount.activeEmployees} active employees`,
      icon: FileText,
    },
    {
      label: "Average net salary",
      value: formatINR(Number(data.payroll.averageNetPay)),
      hint: `Deductions ${formatINR(Number(data.payroll.totalDeductions))}`,
      icon: BadgeCheck,
    },
    {
      label: "Approved time off",
      value: `${Number(data.timeOff.approvedDays).toFixed(0)} days`,
      hint: `${data.timeOff.pending} request(s) pending`,
      icon: CalendarDays,
    },
    {
      label: "Attendance health",
      value: `${data.attendance.attendanceHealth}%`,
      hint: `${data.attendance.totalRecords} records reviewed`,
      icon: Clock,
    },
  ]

  const alertItems = [
    {
      label: "Missing bank details",
      count: data.alerts.missingBankDetails,
      href: "/payroll/anomalies",
    },
    {
      label: "Active staff without a contract",
      count: data.alerts.employeesWithoutContract,
      href: "/contracts",
    },
    {
      label: "Contracts expiring in 60 days",
      count: data.alerts.expiringContracts,
      href: "/contracts",
    },
    {
      label: "Payroll warnings raised",
      count: data.warnings.total,
      href: "/payroll/anomalies",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Payroll Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Live figures across employees, contracts, attendance, time off, and
            payroll.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/payroll/payruns">
            <Button variant="outline" className="text-xs">
              Payruns
            </Button>
          </Link>
          <Link href="/payroll/payslips">
            <Button variant="outline" className="text-xs">
              Payslips
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters — one row above the charts */}
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-300 bg-white p-4 shadow-sm md:flex-row md:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-[11px] font-semibold text-zinc-600">
            Period from
          </label>
          <Input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-[11px] font-semibold text-zinc-600">
            Period to
          </label>
          <Input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-[11px] font-semibold text-zinc-600">
            Department
          </label>
          <Select
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
          >
            <option value="">All departments</option>
            {(departmentsQuery.data ?? []).map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-[11px] font-semibold text-zinc-600">
            Employee type
          </label>
          <Select
            value={employeeType}
            onChange={(event) => setEmployeeType(event.target.value)}
          >
            <option value="all">All employees</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="terminated">Terminated</option>
          </Select>
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            className="text-xs"
            onClick={() => {
              setFrom("")
              setTo("")
              setDepartmentId("")
              setEmployeeType("all")
            }}
          >
            Reset
          </Button>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-zinc-300 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">
                {kpi.label}
              </span>
              <kpi.icon className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="mt-1.5 text-xl font-bold tabular-nums text-black">
              {kpi.value}
            </div>
            <div className="mt-0.5 text-[11px] text-zinc-500">{kpi.hint}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-300 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-black">
            Salary cost by department
          </h2>
          <p className="mb-4 text-[11px] text-zinc-500">
            Net salary paid in the selected period
          </p>
          <BarChart data={departmentBars} formatValue={compactINR} />
        </div>

        <div className="rounded-xl border border-zinc-300 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-black">
            Monthly net salary trend
          </h2>
          <p className="mb-2 text-[11px] text-zinc-500">
            Net payroll by period, from computed payslips
          </p>
          <TrendChart
            data={trendPoints}
            formatValue={(value) => formatINR(value)}
            formatTick={compactINR}
          />
        </div>
      </div>

      {/* Operational alerts */}
      <div className="rounded-xl border border-zinc-300 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-zinc-200 p-4">
          <AlertTriangle className="h-4 w-4 text-black" />
          <h2 className="text-sm font-bold text-black">Operational alerts</h2>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-zinc-100 lg:grid-cols-4 lg:divide-y-0">
          {alertItems.map((alert) => (
            <Link
              key={alert.label}
              href={alert.href}
              className="p-4 transition hover:bg-zinc-50"
            >
              <div className="text-2xl font-bold tabular-nums text-black">
                {alert.count}
              </div>
              <div className="mt-0.5 text-[11px] text-zinc-500">
                {alert.label}
              </div>
            </Link>
          ))}
        </div>
        {data.warnings.byCode.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-zinc-200 p-4">
            {data.warnings.byCode.map((warning) => (
              <Badge key={warning.code} variant="outline">
                {warning.code.replaceAll("_", " ")} · {warning.count}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Attendance + time off overviews */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-300 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-black">
            Attendance overview
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Present", value: data.attendance.presentDays },
              { label: "Late", value: data.attendance.lateDays },
              { label: "Absent", value: data.attendance.absentDays },
              { label: "Half day", value: data.attendance.halfDays },
              {
                label: "Missing check-out",
                value: data.attendance.missingCheckouts,
              },
              {
                label: "Overtime hrs",
                value: Number(data.attendance.overtimeHours).toFixed(0),
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
              >
                <div className="text-lg font-bold tabular-nums text-black">
                  {item.value}
                </div>
                <div className="text-[11px] text-zinc-500">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-300 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-black">Time off overview</h2>
          <div className="mb-3 grid grid-cols-3 gap-3">
            {[
              { label: "Approved", value: data.timeOff.approved },
              { label: "Pending", value: data.timeOff.pending },
              { label: "Refused", value: data.timeOff.refused },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
              >
                <div className="text-lg font-bold tabular-nums text-black">
                  {item.value}
                </div>
                <div className="text-[11px] text-zinc-500">{item.label}</div>
              </div>
            ))}
          </div>
          {data.leaveBalances.length > 0 ? (
            <div className="space-y-1.5">
              {data.leaveBalances.map((balance) => (
                <div
                  key={balance.typeName}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-zinc-600">{balance.typeName}</span>
                  <span className="tabular-nums text-zinc-900">
                    <span className="font-semibold">
                      {Number(balance.remaining).toFixed(0)}
                    </span>
                    <span className="text-zinc-400">
                      {" "}
                      / {Number(balance.allocated).toFixed(0)} days left
                    </span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">
              No approved leave allocations yet.
            </p>
          )}
        </div>
      </div>

      {/* Department breakdown — also the table view for the bar chart */}
      <div className="overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-zinc-200 p-4">
          <Users className="h-4 w-4 text-black" />
          <h2 className="text-sm font-bold text-black">Department breakdown</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 bg-zinc-50">
              <TableHead className="font-semibold text-black">
                Department
              </TableHead>
              <TableHead className="font-semibold text-black">Headcount</TableHead>
              <TableHead className="font-semibold text-black">Gross</TableHead>
              <TableHead className="text-right font-semibold text-black">
                Net salary
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.departmentCosts.map((row) => (
              <TableRow key={row.departmentId} className="border-zinc-200">
                <TableCell className="font-semibold text-black">
                  {row.department}
                </TableCell>
                <TableCell className="text-xs text-zinc-700">
                  {row.headcount}
                </TableCell>
                <TableCell className="text-xs text-zinc-700">
                  {formatINR(Number(row.grossPay))}
                </TableCell>
                <TableCell className="text-right text-xs font-bold text-black">
                  {formatINR(Number(row.netPay))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Recent payruns */}
      <div className="overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-4">
          <h2 className="text-sm font-bold text-black">Recent payruns</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 bg-zinc-50">
              <TableHead className="font-semibold text-black">Payrun</TableHead>
              <TableHead className="font-semibold text-black">Period</TableHead>
              <TableHead className="font-semibold text-black">Payslips</TableHead>
              <TableHead className="font-semibold text-black">Net total</TableHead>
              <TableHead className="text-right font-semibold text-black">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.recentPayruns.length > 0 ? (
              data.recentPayruns.map((payrun) => (
                <TableRow
                  key={payrun.id}
                  className="border-zinc-200 hover:bg-zinc-50"
                >
                  <TableCell className="font-semibold text-black">
                    <Link
                      href={`/payroll/payruns/${payrun.id}`}
                      className="hover:underline"
                    >
                      {payrun.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-zinc-700">
                    {payrun.periodStart} → {payrun.periodEnd}
                  </TableCell>
                  <TableCell className="text-xs text-zinc-700">
                    {payrun.payslipCount}
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-black">
                    {formatINR(Number(payrun.totalNet))}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={
                        payrun.status === "paid"
                          ? "active"
                          : payrun.status === "validated"
                            ? "running"
                            : payrun.status === "computed"
                              ? "expiring"
                              : "draft"
                      }
                    >
                      {payrun.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-xs text-zinc-500"
                >
                  No payruns in the selected period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
