"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Clock,
  FileText,
  Wallet,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
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
import StatCard from "@/src/components/dashboard/StatCard"
import { compactINR, formatINR, formatStatus, monthLabel } from "@/src/lib/format"
import { apiRequest } from "@/src/lib/api"
import { useAuth } from "@/src/context/AuthContext"

type DashboardData = {
  payroll: {
    totalNetPay: string
    totalGrossPay: string
    totalDeductions: string
    payslipCount: number
    averageNetPay: string
  }
  payslipStatus: { status: string; count: number }[]
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

/** Payslip lifecycle, in order. Colours come from the sequential blue ramp, so
 *  the bar reads as progress rather than as four unrelated categories. */
const statusOrder = [
  { key: "paid", label: "Paid", swatch: "var(--seq-700)" },
  { key: "validated", label: "Validated", swatch: "var(--seq-500)" },
  { key: "computed", label: "Computed", swatch: "var(--seq-400)" },
  { key: "draft", label: "Draft", swatch: "var(--seq-300)" },
]

/** Panel chrome, so every card on the page opens the same way. */
function PanelHeader({
  title,
  source,
  aside,
}: {
  title: string
  source: string
  aside?: React.ReactNode
}) {
  return (
    <CardHeader className="flex-row items-start justify-between gap-4 border-b border-zinc-100 p-5">
      <div>
        <h2 className="font-display text-[15px] font-semibold tracking-[-0.015em] text-zinc-900">
          {title}
        </h2>
        <p className="mt-1 text-xs text-zinc-500">Source: {source}</p>
      </div>
      {aside}
    </CardHeader>
  )
}

export default function PayrollDashboard() {
  const { user } = useAuth()
  // One month, rather than a pair of dates. The API still takes a range, so the
  // selection is expanded to the first and last day of that month.
  const [period, setPeriod] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [employeeType, setEmployeeType] = useState("all")

  const { from, to } = useMemo(() => {
    if (!period) {
      return { from: "", to: "" }
    }
    const [year, month] = period.split("-").map(Number)
    // Day 0 of the next month is the last day of this one.
    const lastDay = new Date(year, month, 0).getDate()
    return { from: `${period}-01`, to: `${period}-${String(lastDay).padStart(2, "0")}` }
  }, [period])

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
  const isLoading = dashboardQuery.isLoading
  const hasFilters = Boolean(period || departmentId || employeeType !== "all")

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

  const statusSplit = useMemo(() => {
    const counts = new Map(
      (data?.payslipStatus ?? []).map((row) => [row.status, row.count]),
    )
    const total = [...counts.values()].reduce((sum, count) => sum + count, 0)
    return {
      total,
      rows: statusOrder.map((status) => ({
        ...status,
        count: counts.get(status.key) ?? 0,
        share: total > 0 ? ((counts.get(status.key) ?? 0) / total) * 100 : 0,
      })),
    }
  }, [data?.payslipStatus])

  const kpis = [
    {
      label: "Total net salary paid",
      value: compactINR(Number(data?.payroll.totalNetPay ?? 0)),
      detail: `Gross ${compactINR(Number(data?.payroll.totalGrossPay ?? 0))}`,
      icon: Wallet,
    },
    {
      label: "Payslips generated",
      value: data?.payroll.payslipCount ?? 0,
      detail: `${statusSplit.rows[0]?.count ?? 0} paid · ${
        (statusSplit.rows[2]?.count ?? 0) + (statusSplit.rows[3]?.count ?? 0)
      } pending`,
      icon: FileText,
    },
    {
      label: "Avg salary / employee",
      value: formatINR(Number(data?.payroll.averageNetPay ?? 0)),
      detail: `Deductions ${compactINR(Number(data?.payroll.totalDeductions ?? 0))}`,
      icon: BadgeCheck,
    },
    {
      label: "Approved time off",
      value: `${Number(data?.timeOff.approvedDays ?? 0).toFixed(0)} days`,
      detail: `${data?.timeOff.pending ?? 0} request(s) pending`,
      icon: CalendarDays,
      tone: (data?.timeOff.pending ?? 0) > 0 ? ("warning" as const) : undefined,
    },
    {
      label: "Attendance health",
      value: `${data?.attendance.attendanceHealth ?? 0}%`,
      detail: `${data?.attendance.totalRecords ?? 0} records reviewed`,
      icon: Clock,
      tone:
        (data?.attendance.attendanceHealth ?? 0) >= 90
          ? ("success" as const)
          : ("warning" as const),
    },
  ]

  const alertItems = [
    {
      label: "employees missing bank details",
      count: data?.alerts.missingBankDetails ?? 0,
      href: "/payroll/anomalies",
    },
    {
      label: "active staff without a contract",
      count: data?.alerts.employeesWithoutContract ?? 0,
      href: "/contracts",
    },
    {
      label: "contracts expiring in 60 days",
      count: data?.alerts.expiringContracts ?? 0,
      href: "/contracts",
    },
    {
      label: "payroll warnings raised",
      count: data?.warnings.total ?? 0,
      href: "/payroll/anomalies",
    },
  ]

  const attendanceBars = [
    { label: "Present", value: data?.attendance.presentDays ?? 0 },
    { label: "Late", value: data?.attendance.lateDays ?? 0 },
    { label: "Absent", value: data?.attendance.absentDays ?? 0 },
    { label: "Half day", value: data?.attendance.halfDays ?? 0 },
  ]

  // Only surface the error when there is no data behind it; a failed background
  // refetch should not throw a banner over figures that are already on screen.
  const loadError =
    dashboardQuery.error && !data
      ? "Could not load the payroll dashboard. Check the API connection and try again."
      : ""

  return (
    <div className="space-y-6">
      {/* ---------- Header ---------- */}
      <header>
        <h1 className="font-display text-[1.75rem] font-semibold tracking-[-0.025em] text-zinc-900">
          Payroll Dashboard
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm text-zinc-500">
          Payments, staffing impact, leave patterns and attendance quality for the
          selected period.
        </p>
      </header>

      {/* ---------- Filters ---------- */}
      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
              Period
            </span>
            <Input
              type="month"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
              Department
            </span>
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
          </label>
          <label className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
              Employee type
            </span>
            <Select
              value={employeeType}
              onChange={(event) => setEmployeeType(event.target.value)}
            >
              <option value="all">All types</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="terminated">Terminated</option>
            </Select>
          </label>
          <label className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
              Company
            </span>
            {/* Every figure is already scoped to the signed-in workspace, so
                this reports the scope rather than offering a choice. */}
            <Input
              readOnly
              tabIndex={-1}
              aria-readonly
              value={user?.organization?.name ?? "Your workspace"}
              className="cursor-default bg-zinc-50 text-zinc-600 focus-visible:ring-0"
            />
          </label>

          {hasFilters && (
            <div className="sm:col-span-2 xl:col-span-4">
              <button
                type="button"
                onClick={() => {
                  setPeriod("")
                  setDepartmentId("")
                  setEmployeeType("all")
                }}
                className="text-xs font-semibold text-harbor-700 hover:text-harbor-900 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {loadError && (
        <div className="flex items-center gap-2.5 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {loadError}
        </div>
      )}

      {/* ---------- Headline figures ---------- */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <StatCard key={kpi.label} {...kpi} loading={isLoading} />
        ))}
      </section>

      {/* ---------- Cost, trend, status ---------- */}
      <section className="grid gap-5 xl:grid-cols-[1fr_1.35fr_1.05fr]">
        <Card>
          <PanelHeader
            title="Salary cost by department"
            source="Payslips + employee department"
          />
          <CardContent className="p-5">
            {isLoading ? (
              <div className="space-y-3.5 py-1" aria-hidden>
                {[92, 74, 58, 44, 30].map((width, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[110px_1fr] items-center gap-3"
                  >
                    <Skeleton className="h-3 w-20 rounded" />
                    <Skeleton
                      className="h-2.5 rounded-full"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <BarChart
                data={departmentBars}
                formatValue={compactINR}
                emptyMessage="No department payroll data yet"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <PanelHeader
            title="Monthly net salary trend"
            source="Historical payslips / payruns"
          />
          <CardContent className="p-5">
            {isLoading ? (
              <div className="flex h-[240px] items-end gap-2" aria-hidden>
                {[38, 52, 46, 64, 58, 78, 70, 88].map((height, index) => (
                  <Skeleton
                    key={index}
                    className="flex-1 rounded-md"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            ) : (
              <TrendChart
                data={trendPoints}
                formatValue={formatINR}
                formatTick={compactINR}
                emptyMessage="No computed payruns yet"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <PanelHeader
            title="Payslip status & alerts"
            source="Payrun + payslip validation"
          />
          <CardContent className="space-y-5 p-5">
            {/* Status split — one stacked bar, with a legend carrying the counts. */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                Status split
              </p>
              {isLoading ? (
                <Skeleton className="mt-3 h-3 w-full rounded-full" />
              ) : statusSplit.total > 0 ? (
                <>
                  <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full">
                    {statusSplit.rows
                      .filter((row) => row.count > 0)
                      .map((row) => (
                        <span
                          key={row.key}
                          title={`${row.label}: ${row.count}`}
                          style={{
                            width: `${row.share}%`,
                            backgroundColor: row.swatch,
                          }}
                        />
                      ))}
                  </div>
                  <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-2">
                    {statusSplit.rows.map((row) => (
                      <div key={row.key} className="flex items-center gap-2 text-xs">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: row.swatch }}
                        />
                        <dt className="text-zinc-500">{row.label}</dt>
                        <dd className="ml-auto font-mono font-semibold tabular-nums text-zinc-900">
                          {row.count}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : (
                <p className="mt-3 text-xs text-zinc-400">No payslips in scope.</p>
              )}
            </div>

            <div className="border-t border-zinc-100 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                Current alerts
              </p>
              <ul className="mt-3 space-y-2">
                {alertItems.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 text-[13px] transition-colors hover:bg-harbor-50/70"
                    >
                      <span
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                          item.count > 0 ? "bg-danger" : "bg-success"
                        }`}
                      />
                      <span className="text-zinc-600">
                        {isLoading ? (
                          <Skeleton className="inline-block h-3 w-6 rounded align-middle" />
                        ) : (
                          <strong className="font-mono font-semibold tabular-nums text-zinc-900">
                            {item.count}
                          </strong>
                        )}{" "}
                        {item.label}
                      </span>
                      <ArrowUpRight className="ml-auto mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ---------- Attendance, time off, departments ---------- */}
      <section className="grid gap-5 xl:grid-cols-3">
        <Card>
          <PanelHeader title="Attendance overview" source="Attendance records" />
          <CardContent className="p-5">
            {isLoading ? (
              <div className="space-y-3" aria-hidden>
                {[0, 1, 2, 3].map((row) => (
                  <Skeleton key={row} className="h-3 w-full rounded" />
                ))}
              </div>
            ) : (
              <>
                <BarChart
                  data={attendanceBars}
                  formatValue={(value) => String(value)}
                  emptyMessage="No attendance records in scope"
                />
                <dl className="mt-5 space-y-2 border-t border-zinc-100 pt-4 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Missing check-outs</dt>
                    <dd className="font-mono font-semibold tabular-nums text-zinc-900">
                      {data?.attendance.missingCheckouts ?? 0}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Overtime hours</dt>
                    <dd className="font-mono font-semibold tabular-nums text-zinc-900">
                      {Number(data?.attendance.overtimeHours ?? 0).toFixed(1)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Attendance coverage</dt>
                    <dd className="font-mono font-semibold tabular-nums text-zinc-900">
                      {data?.attendance.attendanceHealth ?? 0}%
                    </dd>
                  </div>
                </dl>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <PanelHeader
            title="Time off overview"
            source="Time off requests + allocations"
          />
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Allocated</TableHead>
                  <TableHead className="text-right">Taken</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [0, 1, 2].map((row) => (
                    <TableRow key={row}>
                      <TableCell colSpan={4}>
                        <Skeleton className="h-3 w-full rounded" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (data?.leaveBalances ?? []).length > 0 ? (
                  data!.leaveBalances.map((row) => (
                    <TableRow key={row.typeName}>
                      <TableCell className="font-medium text-zinc-900">
                        {row.typeName}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {Number(row.allocated).toFixed(0)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {Number(row.taken).toFixed(0)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold tabular-nums text-zinc-900">
                        {Number(row.remaining).toFixed(0)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-28 text-center text-sm text-zinc-400"
                    >
                      No leave allocations in scope.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <PanelHeader
            title="Department overview"
            source="Employee + contract + payslip totals"
          />
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Headcount</TableHead>
                  <TableHead className="text-right">Net salary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [0, 1, 2].map((row) => (
                    <TableRow key={row}>
                      <TableCell colSpan={3}>
                        <Skeleton className="h-3 w-full rounded" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (data?.departmentCosts ?? []).length > 0 ? (
                  data!.departmentCosts.map((row) => (
                    <TableRow key={row.departmentId}>
                      <TableCell className="font-medium text-zinc-900">
                        {row.department}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {row.headcount}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold tabular-nums text-zinc-900">
                        {compactINR(Number(row.netPay))}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-28 text-center text-sm text-zinc-400"
                    >
                      No departments yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* ---------- Recent payruns ---------- */}
      <Card>
        <PanelHeader
          title="Recent payruns"
          source="Payruns + payslip totals"
          aside={
            <Link
              href="/payroll/payruns"
              className="inline-flex items-center gap-1 text-xs font-semibold text-harbor-700 hover:text-harbor-900"
            >
              View all
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payrun</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Payslips</TableHead>
                <TableHead className="text-right">Net total</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [0, 1, 2].map((row) => (
                  <TableRow key={row}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-3.5 w-full rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (data?.recentPayruns ?? []).length > 0 ? (
                data!.recentPayruns.map((payrun) => (
                  <TableRow key={payrun.id}>
                    <TableCell>
                      <Link
                        href={`/payroll/payruns/${payrun.id}`}
                        className="font-medium text-zinc-900 hover:text-harbor-700 hover:underline"
                      >
                        {payrun.name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-zinc-500">
                      {payrun.periodStart} → {payrun.periodEnd}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {payrun.payslipCount}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold tabular-nums text-zinc-900">
                      {compactINR(Number(payrun.totalNet))}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={payrun.status === "paid" ? "active" : "running"}>
                        {formatStatus(payrun.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-28 text-center text-sm text-zinc-400"
                  >
                    No payruns created yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
