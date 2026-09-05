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
  ArrowLeft,
  CheckCircle2,
  Clock,
  Play,
  Check,
  DollarSign,
  AlertCircle,
  FileCheck,
  XCircle,
} from "lucide-react"

interface PayrunDetailsProps {
  id?: string
}

export default function PayrunDetails({ id }: PayrunDetailsProps) {
  const { payruns, updatePayrunStatus, getPayrunById } = usePayroll()

  const payrun = useMemo(() => {
    if (!id) return payruns[0]
    return getPayrunById(id) || payruns.find((p) => p.id === id) || payruns[0]
  }, [id, payruns, getPayrunById])

  if (!payrun) {
    return (
      <div className="space-y-6 py-12 text-center">
        <XCircle className="h-12 w-12 text-zinc-300 mx-auto" />
        <h2 className="text-lg font-bold text-black">Payrun Not Found</h2>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
          The requested payrun ID does not exist or has been removed.
        </p>
        <Link href="/payroll/payruns">
          <Button size="sm" className="bg-black hover:bg-zinc-800 text-white border border-black">
            Return to Payruns
          </Button>
        </Link>
      </div>
    )
  }

  const currentStatus = payrun.status

  const steps = [
    { label: "Draft", key: "Draft" },
    { label: "Computed", key: "Computed" },
    { label: "Validated", key: "Validated" },
    { label: "Paid", key: "Paid" },
  ]

  const getStepState = (stepKey: string) => {
    const order = ["Draft", "Computed", "Validated", "Paid"]
    const currentIndex = order.indexOf(currentStatus)
    const stepIndex = order.indexOf(stepKey)

    if (stepIndex < currentIndex) return "completed"
    if (stepIndex === currentIndex) return "current"
    return "upcoming"
  }

  const handleCompute = () => {
    updatePayrunStatus(payrun.id, "Computed")
  }

  const handleValidate = () => {
    updatePayrunStatus(payrun.id, "Validated")
  }

  const handleMarkAsPaid = () => {
    updatePayrunStatus(payrun.id, "Paid")
  }

  return (
    <div className="space-y-6">
      {/* Navigation Back Link */}
      <div className="flex items-center gap-2 text-xs">
        <Link href="/payroll/payruns" className="flex items-center gap-1 text-zinc-600 hover:text-black transition">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Payruns
        </Link>
        <span className="text-zinc-300">/</span>
        <span className="text-black font-semibold">{payrun.id}</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-black">
              {payrun.name}
            </h1>
            <Badge
              variant={
                currentStatus === "Paid"
                  ? "active"
                  : currentStatus === "Validated"
                  ? "running"
                  : currentStatus === "Computed"
                  ? "expiring"
                  : "draft"
              }
            >
              {currentStatus}
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Period: <span className="font-semibold text-black">{payrun.period}</span> &bull; Structure:{" "}
            <span className="font-semibold text-black">{payrun.salaryStructure}</span>
          </p>
        </div>

        {/* Workflow Execution Action Button */}
        <div className="flex items-center gap-2">
          <Link href="/payroll/health">
            <Button
              variant="outline"
              className="border-zinc-300 text-black hover:bg-zinc-100 font-medium text-xs"
            >
              Payroll Health
            </Button>
          </Link>
          {currentStatus === "Draft" && (
            <Button
              onClick={handleCompute}
              className="bg-black hover:bg-zinc-800 text-white font-medium gap-1.5 border border-black shadow-sm"
            >
              <Play className="h-4 w-4" />
              Compute Payrun
            </Button>
          )}

          {currentStatus === "Computed" && (
            <Button
              onClick={handleValidate}
              className="bg-black hover:bg-zinc-800 text-white font-medium gap-1.5 border border-black shadow-sm"
            >
              <Check className="h-4 w-4" />
              Validate Payrun
            </Button>
          )}

          {currentStatus === "Validated" && (
            <Button
              onClick={handleMarkAsPaid}
              className="bg-black hover:bg-zinc-800 text-white font-medium gap-1.5 border border-black shadow-sm"
            >
              <DollarSign className="h-4 w-4" />
              Mark as Paid
            </Button>
          )}

          {currentStatus === "Paid" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 border border-zinc-300 text-xs font-bold text-black">
              <CheckCircle2 className="h-4 w-4 text-black" />
              Payrun Finalized &amp; Paid
            </div>
          )}
        </div>
      </div>

      {/* Progress Workflow Steps Indicator */}
      <div className="p-4 rounded-xl border border-zinc-300 bg-white shadow-sm">
        <div className="text-xs font-semibold text-zinc-500 mb-3 uppercase tracking-wider">
          Payrun Lifecycle Workflow
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {steps.map((st, idx) => {
            const state = getStepState(st.key)
            return (
              <div
                key={st.key}
                className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                  state === "current"
                    ? "bg-black text-white border-black font-semibold shadow-sm"
                    : state === "completed"
                    ? "bg-zinc-100 text-black border-zinc-300 font-medium"
                    : "bg-white text-zinc-400 border-zinc-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      state === "current"
                        ? "bg-white text-black"
                        : state === "completed"
                        ? "bg-black text-white"
                        : "bg-zinc-200 text-zinc-600"
                    }`}
                  >
                    {state === "completed" ? "✓" : idx + 1}
                  </div>
                  <span className="text-xs">{st.label}</span>
                </div>
                {state === "current" && (
                  <span className="text-[10px] bg-zinc-800 text-white px-1.5 py-0.5 rounded border border-zinc-700">
                    Active Step
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Payrun Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-zinc-300 shadow-sm">
          <div className="text-xs text-zinc-500 font-medium">Target Employees</div>
          <div className="text-xl font-bold text-black mt-1">
            {payrun.employeeCount} staff
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-zinc-300 shadow-sm">
          <div className="text-xs text-zinc-500 font-medium">Total Net Payroll</div>
          <div className="text-xl font-bold text-black mt-1">
            {formatINR(payrun.totalAmount)}
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-zinc-300 shadow-sm">
          <div className="text-xs text-zinc-500 font-medium">Lifecycle Status</div>
          <div className="text-xl font-bold text-black mt-1 flex items-center gap-2">
            <span>{payrun.status}</span>
          </div>
        </div>
      </div>

      {/* Employee Breakdown Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-black">
            Employee Payroll Breakdown
          </h2>
          <span className="text-xs text-zinc-500">
            {payrun.employees && payrun.employees.length > 0
              ? `${payrun.employees.length} record(s)`
              : "Pending computation"}
          </span>
        </div>

        <div className="rounded-xl border border-zinc-300 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-200 bg-zinc-50">
                <TableHead className="text-black font-semibold">Employee ID &amp; Name</TableHead>
                <TableHead className="text-black font-semibold">Department</TableHead>
                <TableHead className="text-black font-semibold">Basic Salary</TableHead>
                <TableHead className="text-black font-semibold">Allowances</TableHead>
                <TableHead className="text-black font-semibold">Deductions</TableHead>
                <TableHead className="text-black font-semibold text-right">Net Salary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrun.employees && payrun.employees.length > 0 ? (
                payrun.employees.map((emp) => (
                  <TableRow key={emp.id} className="border-zinc-200 hover:bg-zinc-50">
                    <TableCell className="font-semibold text-black">
                      <div>
                        {emp.name}
                        <div className="text-xs text-zinc-500 font-mono font-normal">
                          {emp.id}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-zinc-700">
                      {emp.department}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-800">
                      {formatINR(emp.basicSalary)}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-800">
                      +{formatINR(emp.allowances)}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-800">
                      -{formatINR(emp.deductions)}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-black text-right">
                      {formatINR(emp.netSalary)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-zinc-500 space-y-2 py-6">
                      <Clock className="h-8 w-8 text-zinc-300" />
                      <p className="text-sm font-bold text-black">
                        {currentStatus === "Draft"
                          ? "Payrun in Draft State"
                          : "No employee breakdown data"}
                      </p>
                      <p className="text-xs text-zinc-500 max-w-sm">
                        {currentStatus === "Draft"
                          ? "Click the 'Compute Payrun' button above to execute calculations for employee net salaries."
                          : "No employee line items are attached to this payrun record."}
                      </p>
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
