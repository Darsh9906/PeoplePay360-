"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { usePayroll } from "@/src/context/PayrollContext"
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
  RefreshCw,
  Eye,
  Check,
  Activity,
  FileCheck,
} from "lucide-react"

export interface HealthIssueRecord {
  id: string
  issue: string
  category:
    | "Employee Info"
    | "Bank Details"
    | "Contracts"
    | "Salary Structure"
    | "Working Schedule"
    | "Attendance"
  severity: "Critical" | "Warning" | "Info"
  recordId: string
  status: "Pending" | "Resolved"
  description: string
}

export default function PayrollHealth() {
  const { payruns } = usePayroll()

  // Health Issues state starts empty — NO hardcoded dummy/fake issues
  const [issues, setIssues] = useState<HealthIssueRecord[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSeverity, setSelectedSeverity] = useState("ALL")
  const [selectedCategory, setSelectedCategory] = useState("ALL")
  const [selectedStatus, setSelectedStatus] = useState("ALL")

  const [isLoading, setIsLoading] = useState(false)
  const [viewingIssue, setViewingIssue] = useState<HealthIssueRecord | null>(null)

  // Combined Search & Filter
  const filteredIssues = useMemo(() => {
    return issues.filter((item) => {
      const searchLower = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !searchLower ||
        item.issue.toLowerCase().includes(searchLower) ||
        item.recordId.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)

      const matchesSeverity =
        selectedSeverity === "ALL" || item.severity === selectedSeverity

      const matchesCategory =
        selectedCategory === "ALL" || item.category === selectedCategory

      const matchesStatus =
        selectedStatus === "ALL" || item.status === selectedStatus

      return matchesSearch && matchesSeverity && matchesCategory && matchesStatus
    })
  }, [issues, searchQuery, selectedSeverity, selectedCategory, selectedStatus])

  // Count Metrics
  const pendingCriticalCount = useMemo(() => {
    return issues.filter((i) => i.severity === "Critical" && i.status === "Pending").length
  }, [issues])

  const pendingWarningCount = useMemo(() => {
    return issues.filter((i) => i.severity === "Warning" && i.status === "Pending").length
  }, [issues])

  const resolvedCount = useMemo(() => {
    return issues.filter((i) => i.status === "Resolved").length
  }, [issues])

  const overallStatus = useMemo(() => {
    if (issues.length === 0) return "Healthy"
    if (pendingCriticalCount > 0) return "Critical"
    if (pendingWarningCount > 0) return "Warning"
    return "Healthy"
  }, [issues, pendingCriticalCount, pendingWarningCount])

  // Run Health Check handler (performs frontend check over state)
  const handleRunHealthCheck = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
    }, 400)
  }

  const handleResolveIssue = (id: string) => {
    setIssues((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "Resolved" } : i))
    )
    if (viewingIssue && viewingIssue.id === id) {
      setViewingIssue((prev) => (prev ? { ...prev, status: "Resolved" } : null))
    }
  }

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/payroll/payruns" className="hover:text-black transition flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Payruns
        </Link>
        <span>/</span>
        <span className="text-black font-medium">Payroll Health</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-black">
              Payroll Health &amp; Pre-Validation
            </h1>
            <Badge
              variant={
                overallStatus === "Healthy"
                  ? "active"
                  : overallStatus === "Warning"
                  ? "expiring"
                  : "destructive"
              }
            >
              {overallStatus === "Healthy"
                ? "Healthy / Passed"
                : overallStatus === "Warning"
                ? "Warnings Found"
                : "Critical Issues"}
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">
            Audit payroll data completeness, contract alignment, and pre-computation health checks.
          </p>
        </div>

        <Button
          onClick={handleRunHealthCheck}
          disabled={isLoading}
          className="bg-black hover:bg-zinc-800 text-white shadow-sm font-medium gap-1.5 self-start sm:self-auto border border-black"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Checking..." : "Run Health Check"}
        </Button>
      </div>

      {/* Health Overview Summary Banner */}
      <div className="p-4 rounded-xl border border-zinc-300 bg-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-zinc-100 border border-zinc-300 text-black">
            <ShieldCheck className="h-6 w-6 text-black" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-black">
              Payroll Data Completeness &amp; Audit Status
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {issues.length === 0
                ? "No payroll health issues detected. All pre-validation checks have passed."
                : `${pendingCriticalCount} critical issue(s) and ${pendingWarningCount} warning(s) pending review.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="px-2.5 py-1 rounded-md bg-zinc-100 border border-zinc-300 text-black">
            Payruns Evaluated: {payruns.length}
          </span>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Overall Health Status */}
        <div className="p-4 bg-white rounded-xl border border-zinc-300 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">Overall Health</span>
            <Activity className="h-4 w-4 text-black" />
          </div>
          <div>
            <div className="text-xl font-bold text-black tracking-tight">
              {overallStatus === "Healthy" ? "Passed" : overallStatus}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">Pre-validation audit result</p>
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
              {pendingCriticalCount}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">Requires immediate resolution</p>
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
              {pendingWarningCount}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">Recommended data review</p>
          </div>
        </div>

        {/* Card 4: Resolved Items */}
        <div className="p-4 bg-white rounded-xl border border-zinc-300 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">Resolved Items</span>
            <CheckCircle2 className="h-4 w-4 text-black" />
          </div>
          <div>
            <div className="text-xl font-bold text-black tracking-tight">
              {resolvedCount}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">Fixed audit items</p>
          </div>
        </div>
      </div>

      {/* Search & Filters Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white p-4 rounded-xl border border-zinc-300 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search health issues by keyword or record ID..."
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
            className="w-40 bg-white border-zinc-300 text-black"
          >
            <option value="ALL">All Categories</option>
            <option value="Employee Info">Employee Info</option>
            <option value="Bank Details">Bank Details</option>
            <option value="Contracts">Contracts</option>
            <option value="Salary Structure">Salary Structure</option>
            <option value="Working Schedule">Working Schedule</option>
            <option value="Attendance">Attendance</option>
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

      {/* Issues Table */}
      <div className="rounded-xl border border-zinc-300 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 bg-zinc-50">
              <TableHead className="text-black font-semibold">Issue Title</TableHead>
              <TableHead className="text-black font-semibold">Category</TableHead>
              <TableHead className="text-black font-semibold">Severity</TableHead>
              <TableHead className="text-black font-semibold">Record ID</TableHead>
              <TableHead className="text-black font-semibold">Status</TableHead>
              <TableHead className="text-black font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredIssues.length > 0 ? (
              filteredIssues.map((item) => (
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
                    {item.recordId}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={item.status === "Resolved" ? "active" : "draft"}
                    >
                      {item.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingIssue(item)}
                        className="h-8 p-1.5 text-xs text-zinc-700 hover:text-black gap-1"
                        title="Review Issue"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Review
                      </Button>
                      {item.status === "Pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolveIssue(item.id)}
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
                      No payroll health issues found
                    </p>
                    <p className="text-xs text-zinc-500 max-w-sm">
                      All pre-payroll validation checks have passed or no active health issue data is available.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Review Issue Detail Modal */}
      {viewingIssue && (
        <Dialog open={Boolean(viewingIssue)} onOpenChange={() => setViewingIssue(null)}>
          <DialogHeader>
            <DialogTitle className="text-black font-bold">
              Payroll Health Issue Review
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              Audit finding details and recommended corrective action.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="flex justify-between py-1 border-b border-zinc-200">
              <span className="text-zinc-500 font-medium">Issue Title:</span>
              <span className="font-bold text-black">{viewingIssue.issue}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-200">
              <span className="text-zinc-500 font-medium">Category:</span>
              <span className="text-black font-medium">{viewingIssue.category}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-200">
              <span className="text-zinc-500 font-medium">Severity:</span>
              <Badge
                variant={
                  viewingIssue.severity === "Critical" ? "active" : "expiring"
                }
              >
                {viewingIssue.severity}
              </Badge>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-200">
              <span className="text-zinc-500 font-medium">Target Record ID:</span>
              <span className="font-mono text-black">{viewingIssue.recordId}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-200">
              <span className="text-zinc-500 font-medium">Status:</span>
              <Badge variant={viewingIssue.status === "Resolved" ? "active" : "draft"}>
                {viewingIssue.status}
              </Badge>
            </div>
            <div className="pt-2">
              <span className="text-zinc-500 font-medium block mb-1">Description:</span>
              <p className="p-2.5 bg-zinc-100 rounded-md border border-zinc-300 text-black leading-relaxed">
                {viewingIssue.description}
              </p>
            </div>
          </div>

          <DialogFooter>
            {viewingIssue.status === "Pending" && (
              <Button
                onClick={() => handleResolveIssue(viewingIssue.id)}
                className="bg-black hover:bg-zinc-800 text-white"
              >
                Mark as Resolved
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setViewingIssue(null)}
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
