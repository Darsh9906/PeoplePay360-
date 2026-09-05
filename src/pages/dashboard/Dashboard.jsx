"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowUpRight,
  Clock3,
  FileCheck2,
  IndianRupee,
  UsersRound,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function formatINR(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0))
}

function formatStatus(status) {
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Draft"
}

function PayrollTrend({ netPay }) {
  const total = Number(netPay || 0)
  const values = [0.68, 0.76, 0.81, 0.88, 0.94, 1].map((ratio) => Math.round(total * ratio))
  const max = Math.max(...values, 1)
  const points = values.map((value, index) => `${index * 60 + 10},${100 - (value / max) * 80}`).join(" ")

  return (
    <div className="space-y-3">
      <svg className="h-44 w-full overflow-visible" viewBox="0 0 320 120" role="img" aria-label="Payroll cost trend">
        <line x1="10" y1="100" x2="310" y2="100" stroke="currentColor" className="text-zinc-200" />
        <line x1="10" y1="60" x2="310" y2="60" stroke="currentColor" strokeDasharray="3 4" className="text-zinc-200" />
        <line x1="10" y1="20" x2="310" y2="20" stroke="currentColor" strokeDasharray="3 4" className="text-zinc-200" />
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-black" />
        {values.map((value, index) => {
          const x = index * 60 + 10
          const y = 100 - (value / max) * 80
          return <circle key={value} cx={x} cy={y} r="3.5" fill="white" stroke="currentColor" strokeWidth="2" className="text-black" />
        })}
      </svg>
      <div className="grid grid-cols-6 text-center text-[10px] text-zinc-500">
        {["Apr", "May", "Jun", "Jul", "Aug", "Sep"].map((month) => <span key={month}>{month}</span>)}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    const controller = new AbortController()

    async function loadDashboard() {
      try {
        setIsLoading(true)
        setLoadError("")

        const response = await fetch("/api/dashboard", {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error("Unable to load dashboard")
        }

        const payload = await response.json()
        setDashboard(payload.data)
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }

        setLoadError("Could not load dashboard data from backend.")
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadDashboard()

    return () => controller.abort()
  }, [])

  const kpis = useMemo(() => {
    const headcount = dashboard?.headcount
    const attendance = dashboard?.attendance
    const payroll = dashboard?.payroll

    return [
      { label: "Employees", value: headcount?.totalEmployees ?? 0, detail: `${headcount?.activeEmployees ?? 0} active`, icon: UsersRound },
      { label: "Payslips", value: payroll?.payslipCount ?? 0, detail: `${formatINR(payroll?.totalNetPay)} net pay`, icon: FileCheck2 },
      { label: "Late / Absent", value: (attendance?.lateDays ?? 0) + (attendance?.absentDays ?? 0), detail: `${attendance?.presentDays ?? 0} present records`, icon: Clock3 },
      { label: "Warnings", value: dashboard?.warnings ?? 0, detail: "Payroll checks", icon: AlertTriangle },
    ]
  }, [dashboard])

  const departmentData = dashboard?.departmentCosts ?? []
  const recentPayruns = dashboard?.recentPayruns ?? []
  const maxDepartmentPay = Math.max(...departmentData.map((department) => Number(department.netPay || 0)), 1)

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-1 border-b border-zinc-300 pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-black">Dashboard</h1>
        <p className="text-sm text-zinc-600">Live overview of workforce, attendance and payroll operations.</p>
      </header>

      {loadError && (
        <div className="rounded-md border border-zinc-300 bg-zinc-50 px-4 py-3 text-sm font-medium text-black">
          {loadError}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, detail, icon: Icon }) => (
          <Card key={label} className="border-zinc-300 bg-white shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span><Icon className="h-4 w-4 text-zinc-400" /></div>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-black">{isLoading ? "..." : value}</p>
              <p className="mt-1 text-xs text-zinc-500">{isLoading ? "Loading backend data" : detail}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="border-zinc-300 bg-white shadow-sm">
          <CardHeader className="border-b border-zinc-200 p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-black">Department Payroll Cost</h2><p className="mt-1 text-xs text-zinc-500">Net pay grouped by department</p></div><Badge variant="outline">{dashboard?.headcount?.totalEmployees ?? 0} employees</Badge></div></CardHeader>
          <CardContent className="space-y-4 p-5">
            {departmentData.length > 0 ? departmentData.map((department) => {
              const netPay = Number(department.netPay || 0)
              return (
                <div key={department.department} className="grid grid-cols-[92px_1fr_96px] items-center gap-3 text-xs">
                  <span className="truncate text-zinc-600">{department.department}</span>
                  <div className="h-2 rounded-full bg-zinc-100"><div className="h-2 rounded-full bg-black" style={{ width: `${(netPay / maxDepartmentPay) * 100}%` }} /></div>
                  <span className="text-right font-semibold text-black">{formatINR(netPay)}</span>
                </div>
              )
            }) : (
              <p className="py-10 text-center text-sm text-zinc-500">{isLoading ? "Loading department data..." : "No department payroll data yet."}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-300 bg-white shadow-sm">
          <CardHeader className="border-b border-zinc-200 p-5"><div><h2 className="font-semibold text-black">Contract Status</h2><p className="mt-1 text-xs text-zinc-500">Current agreement portfolio</p></div></CardHeader>
          <CardContent className="flex items-center gap-8 p-5">
            <div className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full" style={{ background: "conic-gradient(#111 0deg 300deg, #737373 300deg 338deg, #d4d4d4 338deg 360deg)" }}><div className="grid h-24 w-24 place-items-center rounded-full bg-white"><strong className="text-2xl text-black">{dashboard?.headcount?.activeEmployees ?? 0}</strong><span className="text-[10px] text-zinc-500">active</span></div></div>
            <div className="grid flex-1 gap-3 text-xs">{[
              { label: "Total employees", value: dashboard?.headcount?.totalEmployees ?? 0, tone: "bg-black" },
              { label: "Active employees", value: dashboard?.headcount?.activeEmployees ?? 0, tone: "bg-zinc-500" },
              { label: "Approved leaves", value: dashboard?.timeOff?.approved ?? 0, tone: "bg-zinc-400" },
              { label: "Pending leaves", value: dashboard?.timeOff?.pending ?? 0, tone: "bg-zinc-200" },
            ].map((item) => <div key={item.label} className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${item.tone}`} /><span className="text-zinc-600">{item.label}</span><strong className="ml-auto text-black">{isLoading ? "..." : item.value}</strong></div>)}</div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <Card className="border-zinc-300 bg-white shadow-sm"><CardHeader className="border-b border-zinc-200 p-5"><div><h2 className="font-semibold text-black">Payroll Cost Trend</h2><p className="mt-1 text-xs text-zinc-500">Based on current net payroll total</p></div></CardHeader><CardContent className="p-5"><PayrollTrend netPay={dashboard?.payroll?.totalNetPay} /></CardContent></Card>
        <Card className="border-zinc-300 bg-white shadow-sm"><CardHeader className="border-b border-zinc-200 p-5"><h2 className="font-semibold text-black">Needs Attention</h2><p className="mt-1 text-xs text-zinc-500">Items requiring follow-up</p></CardHeader><CardContent className="space-y-2 p-5">{[
          { label: `${dashboard?.warnings ?? 0} payroll warnings`, href: "/dashboard" },
          { label: `${dashboard?.attendance?.lateDays ?? 0} late attendance records`, href: "/attendance" },
          { label: `${dashboard?.timeOff?.pending ?? 0} pending leave requests`, href: "/dashboard" },
        ].map((item) => <Link key={item.label} href={item.href} className="flex items-center gap-3 rounded-md border border-zinc-200 p-3 text-sm text-zinc-700 transition hover:border-black hover:bg-zinc-50"><AlertTriangle className="h-4 w-4 text-zinc-500" /><span>{isLoading ? "Loading..." : item.label}</span><ArrowUpRight className="ml-auto h-4 w-4 text-zinc-400" /></Link>)}</CardContent></Card>
      </section>

      <Card className="border-zinc-300 bg-white shadow-sm"><CardHeader className="border-b border-zinc-200 p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-black">Recent Payruns</h2><p className="mt-1 text-xs text-zinc-500">Latest payroll batches from backend</p></div><Link href="/dashboard" className="flex items-center gap-1 text-xs font-semibold text-black hover:underline">Review <ArrowUpRight className="h-3.5 w-3.5" /></Link></div></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow className="border-zinc-200 bg-zinc-50"><TableHead className="text-zinc-600">Payrun</TableHead><TableHead className="text-zinc-600">Period</TableHead><TableHead className="text-zinc-600">Status</TableHead></TableRow></TableHeader><TableBody>{recentPayruns.length > 0 ? recentPayruns.map((payrun) => <TableRow key={payrun.id} className="border-zinc-200"><TableCell><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-black text-xs font-semibold text-white"><IndianRupee className="h-4 w-4" /></span><span className="font-medium text-black">{payrun.name}</span></div></TableCell><TableCell className="text-zinc-600">{payrun.periodStart} to {payrun.periodEnd}</TableCell><TableCell><Badge className="border-zinc-300 bg-zinc-100 text-zinc-700">{formatStatus(payrun.status)}</Badge></TableCell></TableRow>) : <TableRow className="border-zinc-200"><TableCell colSpan={3} className="h-32 text-center text-sm text-zinc-500">{isLoading ? "Loading payruns..." : "No payruns created yet."}</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
    </main>
  )
}
