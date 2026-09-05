"use client"

import { useMemo } from "react"
import Link from "next/link"
import { usePayroll } from "@/src/context/PayrollContext"
import { formatINR } from "@/src/data/mockData"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  DollarSign,
  FileText,
  Clock,
  ArrowRight,
  Plus,
  AlertCircle,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from "lucide-react"

export default function PayrollDashboard() {
  const { payruns } = usePayroll()

  // Calculate Metrics from live context state
  const totalNetSalary = useMemo(() => {
    return payruns
      .filter((pr) => pr.status === "Paid" || pr.status === "Validated" || pr.status === "Computed")
      .reduce((acc, pr) => acc + pr.totalAmount, 0)
  }, [payruns])

  const activePayrunsCount = useMemo(() => {
    return payruns.filter((pr) => pr.status !== "Paid").length
  }, [payruns])

  const totalPayslipsCount = useMemo(() => {
    return payruns
      .filter((pr) => pr.status === "Paid")
      .reduce((acc, pr) => acc + pr.employeeCount, 0)
  }, [payruns])

  const recentPayruns = useMemo(() => {
    return payruns.slice(0, 5)
  }, [payruns])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Payroll Dashboard
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Main control center for payroll cycles, payrun workflows, and disbursement tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/payroll/payruns">
            <Button className="bg-black hover:bg-zinc-800 text-white shadow-sm font-medium gap-1.5 border border-black">
              View Payruns
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Operational Banner / Alert */}
      <div className="p-4 rounded-xl border border-zinc-300 bg-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-zinc-100 border border-zinc-300 text-black">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-black">Payroll Processing Status</h3>
            <p className="text-xs text-zinc-500">
              {payruns.length === 0
                ? "No active payruns found in the system. Create a payrun to start calculation."
                : `${activePayrunsCount} active payrun(s) in cycle. Compute, validate, and mark as paid.`}
            </p>
          </div>
        </div>
        <Link href="/payroll/payruns">
          <Button size="sm" variant="outline" className="text-xs border-zinc-300 text-black shrink-0">
            Manage Payruns
          </Button>
        </Link>
      </div>

      {/* Summary KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Payroll Amount */}
        <div className="p-5 bg-white rounded-xl border border-zinc-300 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">Total Net Salary</span>
            <div className="p-2 bg-zinc-100 rounded-lg border border-zinc-200">
              <DollarSign className="h-4 w-4 text-black" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-black tracking-tight">
              {formatINR(totalNetSalary)}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">Sum of computed / paid cycles</p>
          </div>
        </div>

        {/* Card 2: Active Payruns */}
        <div className="p-5 bg-white rounded-xl border border-zinc-300 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">Active Payruns</span>
            <div className="p-2 bg-zinc-100 rounded-lg border border-zinc-200">
              <Clock className="h-4 w-4 text-black" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-black tracking-tight">
              {activePayrunsCount}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">Pending computation / validation</p>
          </div>
        </div>

        {/* Card 3: Payslips Generated */}
        <div className="p-5 bg-white rounded-xl border border-zinc-300 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">Payslips Issued</span>
            <div className="p-2 bg-zinc-100 rounded-lg border border-zinc-200">
              <FileText className="h-4 w-4 text-black" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-black tracking-tight">
              {totalPayslipsCount}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">Completed employee disbursements</p>
          </div>
        </div>

        {/* Card 4: System Status */}
        <div className="p-5 bg-white rounded-xl border border-zinc-300 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">System Health</span>
            <div className="p-2 bg-zinc-100 rounded-lg border border-zinc-200">
              <CheckCircle2 className="h-4 w-4 text-black" />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-black tracking-tight flex items-center gap-1.5">
              <span>Operational</span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">Ready for payroll execution</p>
          </div>
        </div>
      </div>

      {/* Recent Payruns Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-black">Recent Payruns</h2>
          <Link href="/payroll/payruns" className="text-xs font-semibold text-zinc-600 hover:text-black">
            View All →
          </Link>
        </div>

        <div className="rounded-xl border border-zinc-300 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-200 bg-zinc-50">
                <TableHead className="text-black font-semibold">Payrun Name</TableHead>
                <TableHead className="text-black font-semibold">Period</TableHead>
                <TableHead className="text-black font-semibold">Structure</TableHead>
                <TableHead className="text-black font-semibold">Employees</TableHead>
                <TableHead className="text-black font-semibold">Total Amount</TableHead>
                <TableHead className="text-black font-semibold">Status</TableHead>
                <TableHead className="text-black font-semibold text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentPayruns.length > 0 ? (
                recentPayruns.map((pr) => {
                  const badgeVariant =
                    pr.status === "Paid"
                      ? "active"
                      : pr.status === "Validated"
                      ? "running"
                      : pr.status === "Computed"
                      ? "expiring"
                      : "draft"

                  return (
                    <TableRow key={pr.id} className="border-zinc-200 hover:bg-zinc-50">
                      <TableCell className="font-semibold text-black">
                        <div>
                          {pr.name}
                          <div className="text-xs text-zinc-500 font-mono font-normal">
                            {pr.id}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs font-mono text-zinc-800">
                        {pr.period}
                      </TableCell>

                      <TableCell className="text-xs text-zinc-700">
                        {pr.salaryStructure}
                      </TableCell>

                      <TableCell className="text-xs font-medium text-black">
                        {pr.employeeCount} staff
                      </TableCell>

                      <TableCell className="text-xs font-semibold text-black">
                        {formatINR(pr.totalAmount)}
                      </TableCell>

                      <TableCell>
                        <Badge variant={badgeVariant}>{pr.status}</Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <Link href={`/payroll/payruns/${pr.id}`}>
                          <Button size="sm" variant="ghost" className="text-xs hover:text-black">
                            View Details
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-56 text-center">
                    <div className="flex flex-col items-center justify-center text-zinc-500 space-y-2 py-6">
                      <XCircle className="h-10 w-10 text-zinc-300" />
                      <p className="text-base font-bold text-black">
                        No payruns available
                      </p>
                      <p className="text-xs text-zinc-500 max-w-sm">
                        There are no payrun records to display. Navigate to Payruns to start a new payroll cycle.
                      </p>
                      <Link href="/payroll/payruns" className="mt-2">
                        <Button size="sm" className="bg-black hover:bg-zinc-800 text-white text-xs border border-black">
                          Go to Payruns
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
