"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Download, Loader2, Printer, XCircle } from "lucide-react"
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
import { formatINR } from "@/src/lib/format"
import { apiRequest } from "@/src/lib/api"

type PayslipLine = {
  id: string
  name: string
  code: string
  category: "basic" | "allowance" | "earning" | "gross" | "deduction" | "net"
  sequence: number
  amount: string
}

type PayslipDetail = {
  id: string
  payrunId: string
  payrunName: string
  periodStart: string
  periodEnd: string
  employeeId: string
  employeeCode: string
  employeeName: string
  department: string | null
  jobTitle: string
  monthlyWage: string | null
  workedDays: string
  leaveDays: string
  grossPay: string
  totalDeductions: string
  netPay: string
  status: string
  lines: PayslipLine[]
}

const categoryLabels: Record<PayslipLine["category"], string> = {
  basic: "Basic",
  allowance: "Allowance",
  earning: "Earning",
  gross: "Gross",
  deduction: "Deduction",
  net: "Net",
}

const earningCategories = new Set(["basic", "allowance", "earning"])

export default function PayslipDetails({ id }: { id?: string }) {
  const payslipQuery = useQuery({
    queryKey: ["payslip", id],
    enabled: Boolean(id),
    queryFn: () => apiRequest<PayslipDetail>(`/api/payslips/${id}`),
  })

  const payslip = payslipQuery.data

  if (payslipQuery.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading payslip...
      </div>
    )
  }

  if (!payslip) {
    return (
      <div className="space-y-6 py-12 text-center">
        <XCircle className="mx-auto h-12 w-12 text-zinc-300" />
        <h2 className="text-lg font-bold text-black">Payslip Not Found</h2>
        <p className="mx-auto max-w-sm text-xs text-zinc-500">
          The requested payslip does not exist or has not been generated yet.
        </p>
        <Link href="/payroll/payslips">
          <Button size="sm">Back to Payslips</Button>
        </Link>
      </div>
    )
  }

  const earnings = payslip.lines.filter((line) =>
    earningCategories.has(line.category),
  )
  const deductions = payslip.lines.filter((line) => line.category === "deduction")

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs">
        <Link
          href="/payroll/payslips"
          className="flex items-center gap-1 text-zinc-600 transition hover:text-black"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Payslips
        </Link>
        <span className="text-zinc-300">/</span>
        <Link
          href={`/payroll/payruns/${payslip.payrunId}`}
          className="text-zinc-600 hover:text-black"
        >
          {payslip.payrunName}
        </Link>
        <span className="text-zinc-300">/</span>
        <span className="font-semibold text-black">{payslip.employeeCode}</span>
      </div>

      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-black">
              {payslip.employeeName}
            </h1>
            <Badge variant={payslip.status === "paid" ? "active" : "running"}>
              {payslip.status.toUpperCase()}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {payslip.jobTitle} &bull; {payslip.department ?? "—"} &bull;{" "}
            {payslip.periodStart} → {payslip.periodEnd}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/payslips/${payslip.id}/pdf`}
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="outline">
              <Printer className="h-4 w-4" />
              Print Payslip
            </Button>
          </a>
          <a href={`/api/payslips/${payslip.id}/pdf?download=true`}>
            <Button>
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </a>
        </div>
      </div>

      {/* Identification */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Employee Code", value: payslip.employeeCode },
          { label: "Worked Days", value: `${payslip.workedDays} days` },
          { label: "Leave Days", value: `${payslip.leaveDays} days` },
          {
            label: "Contract Wage",
            value: payslip.monthlyWage
              ? formatINR(Number(payslip.monthlyWage))
              : "—",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-zinc-300 bg-white p-4 shadow-sm"
          >
            <div className="text-xs font-medium text-zinc-500">{item.label}</div>
            <div className="mt-1 text-base font-bold text-black">
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Salary computation, rule by rule */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-black">Salary Computation</h2>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm">
            <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2.5">
              <h3 className="text-sm font-bold text-black">Earnings</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-200">
                  <TableHead className="font-semibold text-black">
                    Component
                  </TableHead>
                  <TableHead className="font-semibold text-black">
                    Category
                  </TableHead>
                  <TableHead className="text-right font-semibold text-black">
                    Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earnings.map((line) => (
                  <TableRow key={line.id} className="border-zinc-200">
                    <TableCell className="font-medium text-black">
                      {line.name}
                      <div className="font-mono text-[11px] font-normal text-zinc-500">
                        {line.code}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {categoryLabels[line.category]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold text-black">
                      {formatINR(Number(line.amount))}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-zinc-200 bg-zinc-50">
                  <TableCell className="font-bold text-black" colSpan={2}>
                    Gross Salary
                  </TableCell>
                  <TableCell className="text-right font-bold text-black">
                    {formatINR(Number(payslip.grossPay))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm">
            <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2.5">
              <h3 className="text-sm font-bold text-black">Deductions</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-200">
                  <TableHead className="font-semibold text-black">
                    Component
                  </TableHead>
                  <TableHead className="font-semibold text-black">
                    Category
                  </TableHead>
                  <TableHead className="text-right font-semibold text-black">
                    Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deductions.length > 0 ? (
                  deductions.map((line) => (
                    <TableRow key={line.id} className="border-zinc-200">
                      <TableCell className="font-medium text-black">
                        {line.name}
                        <div className="font-mono text-[11px] font-normal text-zinc-500">
                          {line.code}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {categoryLabels[line.category]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-black">
                        {formatINR(Number(line.amount))}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-8 text-center text-xs text-zinc-500"
                    >
                      No deductions applied
                    </TableCell>
                  </TableRow>
                )}
                <TableRow className="border-zinc-200 bg-zinc-50">
                  <TableCell className="font-bold text-black" colSpan={2}>
                    Total Deductions
                  </TableCell>
                  <TableCell className="text-right font-bold text-black">
                    {formatINR(Number(payslip.totalDeductions))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-black bg-black px-5 py-4 text-white shadow-sm">
          <span className="text-sm font-bold uppercase tracking-wide">
            Net Salary Payable
          </span>
          <span className="text-2xl font-bold">
            {formatINR(Number(payslip.netPay))}
          </span>
        </div>
      </div>
    </div>
  )
}
