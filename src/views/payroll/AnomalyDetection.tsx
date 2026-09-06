"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { usePayroll, PayrollAnomalyRecord } from "@/src/context/PayrollContext"
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
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  Eye,
  Check,
  Activity,
  FileCheck,
  RefreshCw,
} from "lucide-react"

export default function AnomalyDetection() {
  const { anomalies, resolveAnomaly } = usePayroll()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("ALL")
  const [selectedSeverity, setSelectedSeverity] = useState("ALL")
  const [selectedStatus, setSelectedStatus] = useState("ALL")

  const [isLoading, setIsLoading] = useState(false)
  const [viewingAnomaly, setViewingAnomaly] = useState<PayrollAnomalyRecord | null>(null)

  // Combined Search & Filter
  const filteredAnomalies = useMemo(() => {
    return anomalies.filter((item) => {
      const searchLower = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !searchLower ||
        item.issue.toLowerCase().includes(searchLower) ||
        item.id.toLowerCase().includes(searchLower) ||
        (item.employeeName && item.employeeName.toLowerCase().includes(searchLower)) ||
        (item.payrunId && item.payrunId.toLowerCase().includes(searchLower))

      const matchesCategory =
        selectedCategory === "ALL" || item.category === selectedCategory

      const matchesSeverity =
        selectedSeverity === "ALL" || item.severity === selectedSeverity

      const matchesStatus =
        selectedStatus === "ALL" || item.status === selectedStatus

      return matchesSearch && matchesCategory && matchesSeverity && matchesStatus
    })
  }, [anomalies, searchQuery, selectedCategory, selectedSeverity, selectedStatus])

  // Overview Counts
  const totalCount = anomalies.length
  const criticalCount = useMemo(() => anomalies.filter((a) => a.severity === "Critical" && a.status === "Pending").length, [anomalies])
  const warningCount = useMemo(() => anomalies.filter((a) => a.severity === "Warning" && a.status === "Pending").length, [anomalies])
  const resolvedCount = useMemo(() => anomalies.filter((a) => a.status === "Resolved").length, [anomalies])

  const handleScan = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
    }, 400)
  }

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/payroll" className="hover:text-black transition flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          Payroll Dashboard
        </Link>
        <span>/</span>
        <span className="text-black font-medium">Anomaly Detection</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-black">
              Payroll Anomaly Detection
            </h1>
            <Badge variant={criticalCount > 0 ? "destructive" : warningCount > 0 ? "expiring" : "active"}>
              {criticalCount > 0 ? "Critical Anomalies" : warningCount > 0 ? "Warnings Found" : "All Checks Passed"}
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">
            Audit payroll variances, duplicate records, contract mismatches, and data completeness.
          </p>
        </div>

        <Button
          onClick={handleScan}
          disabled={isLoading}
          className="bg-black hover:bg-zinc-800 text-white shadow-sm font-medium gap-1.5 self-start sm:self-auto border border-black"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Scanning..." : "Scan for Anomalies"}
        </Button>
      </div>

      {/* Summary KPI Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Issues */}
        <div className="p-4 bg-white rounded-xl border border-zinc-300 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">Total Anomalies</span>
            <Activity className="h-4 w-4 text-black" />
          </div>
          <div>
            <div className="text-xl font-bold text-black tracking-tight">
              {totalCount}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">Detected audit findings</p>
          </div>
        </div>

        {/* Card 2: Critical Issues */}
        <div className="p-4 bg-white rounded-xl border border-zinc-300 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">Critical Issues</span>
            <AlertTriangle className="h-4 w-4 text-black" />
          </div>
          <div>
            <div className="text-xl font-bold text-black tracking-tight">
              {criticalCount}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">Requires immediate attention</p>
          </div>
        </div>

        {/* Card 3: Warnings */}
        <div className="p-4 bg-white rounded-xl border border-zinc-300 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">Warnings</span>
            <FileCheck className="h-4 w-4 text-black" />
          </div>
          <div>
            <div className="text-xl font-bold text-black tracking-tight">
              {warningCount}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">Recommended review items</p>
          </div>
        </div>

        {/* Card 4: Resolved Issues */}
        <div className="p-4 bg-white rounded-xl border border-zinc-300 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">Resolved Issues</span>
            <CheckCircle2 className="h-4 w-4 text-black" />
          </div>
          <div>
            <div className="text-xl font-bold text-black tracking-tight">
              {resolvedCount}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">Cleared variance records</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white p-4 rounded-xl border border-zinc-300 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search anomalies by issue, employee, or payrun..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-zinc-300 focus-visible:ring-black"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-500 hidden sm:block" />
            <Select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-36 bg-white border-zinc-300 text-black"
            >
              <option value="ALL">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="Warning">Warning</option>
              <option value="Info">Info</option>
            </Select>
          </div>

          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-44 bg-white border-zinc-300 text-black text-xs"
          >
            <option value="ALL">All Categories</option>
            <option value="Missing Employee Information">Missing Employee Info</option>
            <option value="Missing Bank/Payment Details">Missing Bank Details</option>
            <option value="Contract Issue">Contract Issue</option>
            <option value="Salary Structure Issue">Salary Structure Issue</option>
            <option value="Salary Rule Issue">Salary Rule Issue</option>
            <option value="Attendance Issue">Attendance Issue</option>
            <option value="Duplicate Payslip">Duplicate Payslip</option>
            <option value="Duplicate Payrun">Duplicate Payrun</option>
            <option value="Payroll Validation Issue">Payroll Validation</option>
          </Select>

          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-36 bg-white border-zinc-300 text-black"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Resolved">Resolved</option>
          </Select>

          {(searchQuery ||
            selectedSeverity !== "ALL" ||
            selectedCategory !== "ALL" ||
            selectedStatus !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("")
                setSelectedSeverity("ALL")
                setSelectedCategory("ALL")
                setSelectedStatus("ALL")
              }}
              className="text-xs text-zinc-600 hover:text-black"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Anomalies Table */}
      <div className="rounded-xl border border-zinc-300 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 bg-zinc-50">
              <TableHead className="text-black font-semibold">Anomaly Issue</TableHead>
              <TableHead className="text-black font-semibold">Category</TableHead>
              <TableHead className="text-black font-semibold">Severity</TableHead>
              <TableHead className="text-black font-semibold">Related Record</TableHead>
              <TableHead className="text-black font-semibold">Status</TableHead>
              <TableHead className="text-black font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAnomalies.length > 0 ? (
              filteredAnomalies.map((item) => (
                <TableRow key={item.id} className="border-zinc-200 hover:bg-zinc-50">
                  <TableCell className="font-semibold text-black">
                    <div>
                      {item.issue}
                      <div className="text-xs text-zinc-500 font-normal line-clamp-1">
                        {item.description}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-xs text-zinc-700 font-medium">
                    <span className="inline-flex items-center rounded-md bg-zinc-100 border border-zinc-300 px-2 py-0.5">
                      {item.category}
                    </span>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={
                        item.severity === "Critical"
                          ? "active"
                          : item.severity === "Warning"
                          ? "expiring"
                          : "inactive"
                      }
                    >
                      {item.severity}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-xs font-mono text-zinc-800">
                    {item.employeeName || item.payrunId || item.payslipId || item.id}
                  </TableCell>

                  <TableCell>
                    <Badge variant={item.status === "Resolved" ? "active" : "draft"}>
                      {item.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingAnomaly(item)}
                        className="h-8 p-1.5 text-xs text-zinc-700 hover:text-black gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Review
                      </Button>
                      {item.status === "Pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resolveAnomaly(item.id)}
                          className="h-8 text-xs border-zinc-300 text-black hover:bg-zinc-100 gap-1"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Resolve
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-56 text-center">
                  <div className="flex flex-col items-center justify-center text-zinc-500 space-y-2 py-6">
                    <ShieldCheck className="h-10 w-10 text-zinc-300" />
                    <p className="text-base font-bold text-black">
                      No payroll anomalies detected
                    </p>
                    <p className="text-xs text-zinc-500 max-w-sm">
                      No active payroll anomaly data available. All pre-validation checks are clear.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Review Anomaly Dialog */}
      {viewingAnomaly && (
        <Dialog open={Boolean(viewingAnomaly)} onOpenChange={() => setViewingAnomaly(null)}>
          <DialogHeader>
            <DialogTitle className="text-black font-bold">
              Anomaly Review
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              Audit finding details and recommended navigation action.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="flex justify-between py-1 border-b border-zinc-200">
              <span className="text-zinc-500 font-medium">Issue:</span>
              <span className="font-bold text-black">{viewingAnomaly.issue}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-200">
              <span className="text-zinc-500 font-medium">Category:</span>
              <span className="text-black font-medium">{viewingAnomaly.category}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-200">
              <span className="text-zinc-500 font-medium">Severity:</span>
              <Badge
                variant={
                  viewingAnomaly.severity === "Critical" ? "active" : "expiring"
                }
              >
                {viewingAnomaly.severity}
              </Badge>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-200">
              <span className="text-zinc-500 font-medium">Status:</span>
              <Badge variant={viewingAnomaly.status === "Resolved" ? "active" : "draft"}>
                {viewingAnomaly.status}
              </Badge>
            </div>

            {viewingAnomaly.employeeName && (
              <div className="flex justify-between py-1 border-b border-zinc-200">
                <span className="text-zinc-500 font-medium">Employee:</span>
                <span className="font-semibold text-black">{viewingAnomaly.employeeName}</span>
              </div>
            )}

            <div className="pt-2">
              <span className="text-zinc-500 font-medium block mb-1">Audit Description:</span>
              <p className="p-2.5 bg-zinc-100 rounded-md border border-zinc-300 text-black leading-relaxed">
                {viewingAnomaly.description}
              </p>
            </div>

            {/* Next Navigation Suggestions */}
            <div className="pt-2 border-t border-zinc-200 flex flex-wrap items-center gap-2">
              <span className="text-zinc-500 font-medium text-[11px]">Related Navigation:</span>
              <Link href="/employees">
                <Button size="sm" variant="outline" className="text-[11px] h-7 border-zinc-300 text-black">
                  View Employees
                </Button>
              </Link>
              <Link href="/payroll/payruns">
                <Button size="sm" variant="outline" className="text-[11px] h-7 border-zinc-300 text-black">
                  View Payruns
                </Button>
              </Link>
              <Link href="/payroll/payslips">
                <Button size="sm" variant="outline" className="text-[11px] h-7 border-zinc-300 text-black">
                  View Payslips
                </Button>
              </Link>
            </div>
          </div>

          <DialogFooter>
            {viewingAnomaly.status === "Pending" && (
              <Button
                onClick={() => {
                  resolveAnomaly(viewingAnomaly.id)
                  setViewingAnomaly(null)
                }}
                className="bg-black hover:bg-zinc-800 text-white"
              >
                Mark as Resolved
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setViewingAnomaly(null)}
              className="border-zinc-300 text-black hover:bg-zinc-100"
            >
              Close
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  )
}
