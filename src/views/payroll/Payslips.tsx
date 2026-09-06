"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { usePayroll } from "@/src/context/PayrollContext"
import { formatINR } from "@/src/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
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
  Search,
  Filter,
  ArrowLeft,
  FileText,
  Eye,
  User,
  Download,
} from "lucide-react"

export default function Payslips() {
  const { payslips } = usePayroll()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("ALL")

  // Combined Search & Filter
  const filteredPayslips = useMemo(() => {
    return payslips.filter((ps) => {
      const searchLower = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !searchLower ||
        ps.employeeName.toLowerCase().includes(searchLower) ||
        ps.employeeId.toLowerCase().includes(searchLower) ||
        ps.payrunName.toLowerCase().includes(searchLower) ||
        ps.id.toLowerCase().includes(searchLower)

      const matchesStatus =
        selectedStatus === "ALL" || ps.status === selectedStatus

      return matchesSearch && matchesStatus
    })
  }, [payslips, searchQuery, selectedStatus])

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/payroll" className="hover:text-black transition flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          Payroll Dashboard
        </Link>
        <span>/</span>
        <span className="text-black font-medium">Payslips</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Payslips
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            View generated employee payslips, gross-to-net breakdown, and disbursement slips.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/payroll/payruns">
            <Button variant="outline" className="border-zinc-300 text-black hover:bg-zinc-100 text-xs">
              View Payruns
            </Button>
          </Link>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white p-4 rounded-xl border border-zinc-300 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search payslips by employee, ID, or payrun..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-zinc-300 focus-visible:ring-black"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-500 hidden sm:block" />
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-36 bg-white border-zinc-300 text-black"
            >
              <option value="ALL">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Generated">Generated</option>
              <option value="Paid">Paid</option>
            </Select>
          </div>

          {(searchQuery || selectedStatus !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("")
                setSelectedStatus("ALL")
              }}
              className="text-xs text-zinc-600 hover:text-black"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Payslips Table */}
      <div className="rounded-xl border border-zinc-300 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 bg-zinc-50">
              <TableHead className="text-black font-semibold">Employee</TableHead>
              <TableHead className="text-black font-semibold">Payrun &amp; Period</TableHead>
              <TableHead className="text-black font-semibold">Gross Salary</TableHead>
              <TableHead className="text-black font-semibold">Deductions</TableHead>
              <TableHead className="text-black font-semibold">Net Salary</TableHead>
              <TableHead className="text-black font-semibold">Status</TableHead>
              <TableHead className="text-black font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayslips.length > 0 ? (
              filteredPayslips.map((ps) => {
                const badgeVariant =
                  ps.status === "Paid"
                    ? "active"
                    : ps.status === "Generated"
                    ? "running"
                    : "draft"

                return (
                  <TableRow key={ps.id} className="border-zinc-200 hover:bg-zinc-50">
                    <TableCell className="font-semibold text-black">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 border border-zinc-300 text-black text-xs font-bold">
                          <User className="h-4 w-4 text-black" />
                        </div>
                        <div>
                          <div className="font-semibold text-black">{ps.employeeName}</div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div>
                        <div className="text-xs font-medium text-black">{ps.payrunName}</div>
                        <div className="text-[11px] text-zinc-500 font-mono">{ps.payPeriod}</div>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs font-medium text-zinc-800">
                      {formatINR(ps.grossSalary)}
                    </TableCell>

                    <TableCell className="text-xs font-medium text-zinc-800">
                      -{formatINR(ps.deductions)}
                    </TableCell>

                    <TableCell className="text-xs font-bold text-black">
                      {formatINR(ps.netSalary)}
                    </TableCell>

                    <TableCell>
                      <Badge variant={badgeVariant}>{ps.status}</Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`/api/payslips/${ps.id}/pdf?download=true`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button size="sm" variant="ghost" className="gap-1 text-xs">
                            <Download className="h-3.5 w-3.5" />
                            PDF
                          </Button>
                        </a>
                        <Link href={`/payroll/payslips/${ps.id}`}>
                          <Button size="sm" variant="outline" className="text-xs border-zinc-300 text-black hover:bg-zinc-100 gap-1">
                            <Eye className="h-3.5 w-3.5" />
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-56 text-center">
                  <div className="flex flex-col items-center justify-center text-zinc-500 space-y-2 py-6">
                    <FileText className="h-10 w-10 text-zinc-300" />
                    <p className="text-base font-bold text-black">
                      No payslips found
                    </p>
                    <p className="text-xs text-zinc-500 max-w-sm">
                      There are no generated or issued payslip records to display. Payruns must be processed to issue payslips.
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
  )
}
