"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { usePayroll } from "@/src/context/PayrollContext"
import { formatINR } from "@/src/data/mockData"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  HelpCircle,
  XCircle,
} from "lucide-react"

interface PayslipDetailsProps {
  id?: string
}

export default function PayslipDetails({ id }: PayslipDetailsProps) {
  const { payslips, getPayslipById } = usePayroll()
  const [showExplanationModal, setShowExplanationModal] = useState(false)

  const payslip = useMemo(() => {
    if (!id) return payslips[0]
    return getPayslipById(id) || payslips.find((p) => p.id === id) || payslips[0]
  }, [id, payslips, getPayslipById])

  if (!payslip) {
    return (
      <div className="space-y-6 py-12 text-center">
        <XCircle className="h-12 w-12 text-zinc-300 mx-auto" />
        <h2 className="text-lg font-bold text-black">Payslip Not Found</h2>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
          The requested payslip record does not exist or has not been generated yet.
        </p>
        <Link href="/payroll/payslips">
          <Button size="sm" className="bg-black hover:bg-zinc-800 text-white border border-black">
            Back to Payslips
          </Button>
        </Link>
      </div>
    )
  }

  const badgeVariant =
    payslip.status === "Paid"
      ? "active"
      : payslip.status === "Generated"
      ? "running"
      : "draft"

  return (
    <div className="space-y-6">
      {/* Navigation Back Link */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/payroll/payslips" className="flex items-center gap-1 text-zinc-600 hover:text-black transition">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Payslips
        </Link>
        <span>/</span>
        <span className="text-black font-semibold">{payslip.id}</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-black">
              Payslip #{payslip.id}
            </h1>
            <Badge variant={badgeVariant}>{payslip.status}</Badge>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Employee: <span className="font-semibold text-black">{payslip.employeeName}</span> &bull; Period:{" "}
            <span className="font-semibold text-black">{payslip.payPeriod}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowExplanationModal(true)}
            variant="outline"
            className="border-zinc-300 text-black hover:bg-zinc-100 font-medium text-xs gap-1.5"
          >
            <HelpCircle className="h-4 w-4" />
            Explain Salary
          </Button>
        </div>
      </div>

      {/* Summary KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Employee Card */}
        <div className="p-4 bg-white rounded-xl border border-zinc-300 shadow-sm space-y-2">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Employee Information
          </div>
          <div className="space-y-1">
            <div className="text-sm font-bold text-black">{payslip.employeeName}</div>
            <div className="text-xs text-zinc-500 font-mono">ID: {payslip.employeeId}</div>
            <div className="text-xs text-zinc-700">Dept: {payslip.department || "General"}</div>
          </div>
        </div>

        {/* Payroll Info Card */}
        <div className="p-4 bg-white rounded-xl border border-zinc-300 shadow-sm space-y-2">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Payroll Information
          </div>
          <div className="space-y-1">
            <div className="text-xs text-zinc-700 font-medium">Payrun: {payslip.payrunName}</div>
            <div className="text-xs text-zinc-700">Period: {payslip.payPeriod}</div>
            <div className="text-xs text-zinc-700">Structure: {payslip.salaryStructure}</div>
          </div>
        </div>

        {/* Worked Days Card */}
        <div className="p-4 bg-white rounded-xl border border-zinc-300 shadow-sm space-y-2">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Worked Days / Attendance
          </div>
          <div className="space-y-1">
            <div className="text-sm font-bold text-black">{payslip.workedDays} Worked Days</div>
            <div className="text-xs text-zinc-500">{payslip.leaveDays} Days Leave / Time-off</div>
            <div className="text-[11px] text-zinc-400">Issued: {payslip.issuedDate}</div>
          </div>
        </div>
      </div>

      {/* Main Salary Breakdown */}
      <div className="p-6 bg-white rounded-xl border border-zinc-300 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
          <h2 className="text-base font-bold text-black">Salary Breakdown</h2>
          <span className="text-xs text-zinc-500 font-mono">Currency: INR (₹)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Earnings Column */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-black uppercase tracking-wider border-b border-zinc-200 pb-2">
              Gross Earnings
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-600 font-medium">Basic Salary</span>
                <span className="font-semibold text-black">{formatINR(payslip.basicSalary)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-600 font-medium">Allowances</span>
                <span className="font-semibold text-black">+{formatINR(payslip.allowances)}</span>
              </div>
              <div className="flex justify-between py-2 font-bold text-sm text-black border-t border-zinc-300 pt-2">
                <span>Total Gross Salary</span>
                <span>{formatINR(payslip.grossSalary)}</span>
              </div>
            </div>
          </div>

          {/* Deductions Column */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-black uppercase tracking-wider border-b border-zinc-200 pb-2">
              Deductions
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-600 font-medium">Payroll Taxes &amp; Withholdings</span>
                <span className="font-semibold text-black">-{formatINR(payslip.deductions)}</span>
              </div>
              <div className="flex justify-between py-2 font-bold text-sm text-black border-t border-zinc-300 pt-2">
                <span>Total Deductions</span>
                <span>-{formatINR(payslip.deductions)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Prominent Net Salary Header */}
        <div className="p-4 bg-zinc-100 rounded-lg border border-zinc-400 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-zinc-600 uppercase tracking-wider">
              Take-Home Net Salary
            </div>
            <p className="text-[11px] text-zinc-500">
              Net Payable = Gross Earnings ({formatINR(payslip.grossSalary)}) &minus; Deductions ({formatINR(payslip.deductions)})
            </p>
          </div>
          <div className="text-2xl font-bold text-black tracking-tight">
            {formatINR(payslip.netSalary)}
          </div>
        </div>
      </div>

      {/* Explain Salary Modal / Section */}
      <Dialog open={showExplanationModal} onOpenChange={setShowExplanationModal}>
        <DialogHeader>
          <DialogTitle className="text-black font-bold">Salary Explanation</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Simplified breakdown of salary components for #{payslip.id} ({payslip.employeeName}).
          </DialogDescription>
        </DialogHeader>

        {payslip.netSalary > 0 ? (
          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 bg-zinc-50 border border-zinc-300 rounded-md space-y-1.5">
              <div className="font-bold text-black text-xs">Basic Salary Component</div>
              <p className="text-zinc-600 leading-relaxed">
                The core fixed portion of employee compensation for work performed during the period.
                Calculated at <span className="font-semibold text-black">{formatINR(payslip.basicSalary)}</span>.
              </p>
            </div>

            <div className="p-3 bg-zinc-50 border border-zinc-300 rounded-md space-y-1.5">
              <div className="font-bold text-black text-xs">Allowances</div>
              <p className="text-zinc-600 leading-relaxed">
                Additional benefits and stipends attached to the employee&apos;s salary structure.
                Totaling <span className="font-semibold text-black">+{formatINR(payslip.allowances)}</span>.
              </p>
            </div>

            <div className="p-3 bg-zinc-50 border border-zinc-300 rounded-md space-y-1.5">
              <div className="font-bold text-black text-xs">Deductions</div>
              <p className="text-zinc-600 leading-relaxed">
                Statutory withholdings, income taxes, and provident fund contributions.
                Totaling <span className="font-semibold text-black">-{formatINR(payslip.deductions)}</span>.
              </p>
            </div>

            <div className="p-3 bg-black text-white rounded-md space-y-1">
              <div className="font-bold text-xs">Net Salary Formula</div>
              <p className="text-zinc-300 leading-relaxed text-[11px]">
                Net Salary = Basic Salary ({formatINR(payslip.basicSalary)}) + Allowances ({formatINR(payslip.allowances)}) &minus; Deductions ({formatINR(payslip.deductions)}) = <span className="font-bold text-white">{formatINR(payslip.netSalary)}</span>.
              </p>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-zinc-500 space-y-2">
            <XCircle className="h-8 w-8 text-zinc-300 mx-auto" />
            <p className="text-sm font-bold text-black">Salary explanation unavailable</p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              No calculated salary component breakdown is available for this payslip record.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={() => setShowExplanationModal(false)}
            className="bg-black hover:bg-zinc-800 text-white"
          >
            Close
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
