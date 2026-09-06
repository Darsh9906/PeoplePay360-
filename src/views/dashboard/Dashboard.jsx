"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  Clock3,
  FileCheck2,
  Receipt,
  UsersRound,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import BarChart from "@/src/components/charts/BarChart"
import RadialGauge from "@/src/components/charts/RadialGauge"
import TrendChart from "@/src/components/charts/TrendChart"
import StatCard from "@/src/components/dashboard/StatCard"
import { compactINR, formatINR, formatStatus, monthLabel } from "@/src/lib/format"
import { apiRequest } from "@/src/lib/api"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/** Section chrome, so every panel on the page opens the same way. */
function PanelHeader({ title, description, aside }) {
  return (
    <CardHeader className="flex-row items-start justify-between gap-4 border-b border-zinc-100 p-5">
      <div>
        <h2 className="font-display text-[15px] font-semibold tracking-[-0.015em] text-zinc-900">
          {title}
        </h2>
        {description && <p className="mt-1 text-xs text-zinc-500">{description}</p>}
      </div>
      {aside}
    </CardHeader>
  )
}

export default function Dashboard() {
  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiRequest("/api/dashboard"),
  })
  const dashboard = dashboardQuery.data
  const isLoading = dashboardQuery.isLoading
  const loadError = dashboardQuery.error
    ? "Could not load dashboard data from the backend."
    : ""

  const kpis = useMemo(() => {
    const headcount = dashboard?.headcount
    const attendance = dashboard?.attendance
    const payroll = dashboard?.payroll
    const exceptions = (attendance?.lateDays ?? 0) + (attendance?.absentDays ?? 0)
    const warnings = dashboard?.warnings?.total ?? 0

    return [
      {
        label: "Employees",
        value: headcount?.totalEmployees ?? 0,
        detail: `${headcount?.activeEmployees ?? 0} active right now`,
        icon: UsersRound,
      },
      {
        label: "Payslips",
        value: payroll?.payslipCount ?? 0,
        detail: `${formatINR(payroll?.totalNetPay)} net pay`,
        icon: Receipt,
      },
      {
        label: "Late / absent",
        value: exceptions,
        detail: `${attendance?.presentDays ?? 0} present records`,
        icon: Clock3,
        tone: exceptions > 0 ? "warning" : "success",
      },
      {
        label: "Warnings",
        value: warnings,
        detail: warnings > 0 ? "Resolve before finalising" : "Payroll checks clear",
        icon: AlertTriangle,
        tone: warnings > 0 ? "danger" : "success",
      },
    ]
  }, [dashboard])

  const totalEmployees = dashboard?.headcount?.totalEmployees ?? 0
  const activeEmployees = dashboard?.headcount?.activeEmployees ?? 0

  const trendPoints = (dashboard?.monthlyTrend ?? []).map((row) => ({
    label: monthLabel(row.month),
    value: Number(row.netPay),
    meta: `${row.payslipCount} payslip${row.payslipCount === 1 ? "" : "s"}`,
  }))

  const departmentBars = (dashboard?.departmentCosts ?? []).map((department) => ({
    label: department.department,
    value: Number(department.netPay || 0),
  }))

  const recentPayruns = dashboard?.recentPayruns ?? []

  const attention = [
    {
      label: "payroll warnings",
      count: dashboard?.warnings?.total ?? 0,
      href: "/payroll/health",
      icon: AlertTriangle,
    },
    {
      label: "late attendance records",
      count: dashboard?.attendance?.lateDays ?? 0,
      href: "/attendance",
      icon: Clock3,
    },
    {
      label: "pending leave requests",
      count: dashboard?.timeOff?.pending ?? 0,
      href: "/timeoff",
      icon: CalendarClock,
    },
  ]

  // Only the two segments the ring actually draws carry a swatch. The leave
  // figures sit below a rule as plain stats, so no colour implies an encoding
  // that isn't plotted.
  const gaugeLegend = [
    { label: "Active", value: activeEmployees, swatch: "var(--chart-1)" },
    {
      label: "Inactive",
      value: Math.max(totalEmployees - activeEmployees, 0),
      swatch: "var(--seq-100)",
    },
  ]

  const leaveStats = [
    { label: "Approved leaves", value: dashboard?.timeOff?.approved ?? 0 },
    { label: "Pending leaves", value: dashboard?.timeOff?.pending ?? 0 },
  ]

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.75rem] font-semibold tracking-[-0.025em] text-zinc-900">
            Overview
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Live view of workforce, attendance and payroll operations.
          </p>
        </div>
        <Link
          href="/payroll/payruns"
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-harbor-800 px-4 text-xs font-semibold text-white shadow-[0_6px_16px_-8px_rgba(22,69,106,0.8)] transition hover:bg-harbor-900"
        >
          Go to payruns
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      {loadError && (
        <div className="flex items-center gap-2.5 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {loadError}
        </div>
      )}

      {/* ---------- Headline figures ---------- */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <StatCard key={kpi.label} {...kpi} loading={isLoading} />
        ))}
      </section>

      {/* ---------- Trend + workforce ---------- */}
      <section className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Card>
          <PanelHeader
            title="Payroll cost trend"
            description="Net payroll by period, from computed payslips"
            aside={
              trendPoints.length > 0 ? (
                <Badge variant="running">{trendPoints.length} periods</Badge>
              ) : null
            }
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
          <PanelHeader title="Workforce" description="Headcount and leave activity" />
          <CardContent className="flex flex-wrap items-center gap-6 p-5">
            {isLoading ? (
              <>
                <Skeleton className="h-[148px] w-[148px] rounded-full" />
                <div className="min-w-[10rem] flex-1 space-y-3.5" aria-hidden>
                  {[0, 1, 2, 3].map((row) => (
                    <Skeleton key={row} className="h-3 w-full rounded" />
                  ))}
                </div>
              </>
            ) : (
              <>
            <RadialGauge
              value={activeEmployees}
              total={totalEmployees}
              label={`of ${totalEmployees} active`}
            />
            <dl className="grid min-w-[10rem] flex-1 gap-3 text-xs">
              {gaugeLegend.map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.swatch }}
                  />
                  <dt className="text-zinc-500">{item.label}</dt>
                  <dd className="ml-auto font-mono font-semibold tabular-nums text-zinc-900">
                    {isLoading ? "—" : item.value}
                  </dd>
                </div>
              ))}

              <div className="my-0.5 border-t border-zinc-100" />

              {leaveStats.map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <dt className="text-zinc-500">{item.label}</dt>
                  <dd className="ml-auto font-mono font-semibold tabular-nums text-zinc-900">
                    {isLoading ? "—" : item.value}
                  </dd>
                </div>
              ))}
            </dl>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ---------- Departments + follow-ups ---------- */}
      <section className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
        <Card>
          <PanelHeader
            title="Department payroll cost"
            description="Net pay grouped by department"
            aside={
              <Badge variant="outline">{totalEmployees} employees</Badge>
            }
          />
          <CardContent className="p-5">
            {isLoading ? (
              <div className="space-y-3.5 py-1" aria-hidden>
                {[92, 74, 58, 44, 30].map((width, index) => (
                  <div key={index} className="grid grid-cols-[132px_1fr] items-center gap-3">
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
            title="Needs attention"
            description="Items waiting on a decision"
          />
          <CardContent className="space-y-2 p-5">
            {attention.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-harbor-200 hover:bg-harbor-50/60"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    item.count > 0
                      ? "bg-warning-soft text-warning"
                      : "bg-success-soft text-success"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="flex min-w-0 items-center gap-1.5 text-sm text-zinc-700">
                  {isLoading ? (
                    <Skeleton className="h-4 w-6 rounded" />
                  ) : (
                    <strong className="font-mono font-semibold tabular-nums text-zinc-900">
                      {item.count}
                    </strong>
                  )}
                  {item.label}
                </span>
                <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-zinc-400" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* ---------- Recent payruns ---------- */}
      <Card>
        <PanelHeader
          title="Recent payruns"
          description="Latest payroll batches"
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
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentPayruns.length > 0 ? (
                recentPayruns.map((payrun) => (
                  <TableRow key={payrun.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-harbor-50 text-harbor-700">
                          <FileCheck2 className="h-4 w-4" />
                        </span>
                        <span className="font-medium text-zinc-900">
                          {payrun.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-zinc-500">
                      {payrun.periodStart} → {payrun.periodEnd}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="running">{formatStatus(payrun.status)}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                isLoading ? (
                  [0, 1, 2].map((row) => (
                    <TableRow key={row}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-xl" />
                          <Skeleton className="h-3.5 w-44 rounded" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-3 w-36 rounded" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-5 w-16 rounded-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-32 text-center text-sm text-zinc-400"
                    >
                      No payruns created yet.
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  )
}
