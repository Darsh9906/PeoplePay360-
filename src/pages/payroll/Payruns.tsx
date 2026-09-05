"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { usePayroll } from "@/src/context/PayrollContext"
import { formatINR } from "@/src/data/mockData"
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
import { Plus, Search, Filter, XCircle, ArrowLeft, ArrowRight } from "lucide-react"

export default function Payruns() {
  const { payruns, addPayrun } = usePayroll()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("ALL")
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form State for New Payrun
  const [formData, setFormData] = useState({
    name: "",
    period: "",
    salaryStructure: "Regular Monthly",
    employeeCount: 1,
  })

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Combined Search & Filter
  const filteredPayruns = useMemo(() => {
    return payruns.filter((pr) => {
      const searchLower = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !searchLower ||
        pr.name.toLowerCase().includes(searchLower) ||
        pr.id.toLowerCase().includes(searchLower) ||
        pr.period.toLowerCase().includes(searchLower)

      const matchesStatus =
        selectedStatus === "ALL" || pr.status === selectedStatus

      return matchesSearch && matchesStatus
    })
  }, [payruns, searchQuery, selectedStatus])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) {
      newErrors.name = "Payrun name is required"
    }
    if (!formData.period.trim()) {
      newErrors.period = "Payroll period is required"
    }
    if (Number(formData.employeeCount) <= 0) {
      newErrors.employeeCount = "Employee count must be greater than 0"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreatePayrun = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    const created = addPayrun({
      name: formData.name.trim(),
      period: formData.period.trim(),
      salaryStructure: formData.salaryStructure,
      employeeCount: Number(formData.employeeCount) || 1,
    })

    setIsModalOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      name: "",
      period: "",
      salaryStructure: "Regular Monthly",
      employeeCount: 1,
    })
    setErrors({})
  }

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/payroll" className="hover:text-black transition">
          Payroll Dashboard
        </Link>
        <span>/</span>
        <span className="text-black font-medium">Payruns</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Payruns
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Create, compute, validate, and finalize organizational payruns.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link href="/payroll/health">
            <Button
              variant="outline"
              className="border-zinc-300 text-black hover:bg-zinc-100 font-medium text-xs"
            >
              Payroll Health
            </Button>
          </Link>
          <Button
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
            }}
            className="bg-black hover:bg-zinc-800 text-white shadow-sm font-medium gap-1.5 border border-black"
          >
            <Plus className="h-4 w-4" />
            New Payrun
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white p-4 rounded-xl border border-zinc-300 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search payruns by name, ID, or period..."
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
              <option value="Computed">Computed</option>
              <option value="Validated">Validated</option>
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

      {/* Payrun Table */}
      <div className="rounded-xl border border-zinc-300 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 bg-zinc-50">
              <TableHead className="text-black font-semibold">Payrun Name</TableHead>
              <TableHead className="text-black font-semibold">Payroll Period</TableHead>
              <TableHead className="text-black font-semibold">Salary Structure</TableHead>
              <TableHead className="text-black font-semibold">Employees</TableHead>
              <TableHead className="text-black font-semibold">Total Amount</TableHead>
              <TableHead className="text-black font-semibold">Status</TableHead>
              <TableHead className="text-black font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayruns.length > 0 ? (
              filteredPayruns.map((pr) => {
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
                        <Button size="sm" variant="outline" className="text-xs border-zinc-300 text-black hover:bg-zinc-100">
                          View &amp; Process
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
                      No payruns found
                    </p>
                    <p className="text-xs text-zinc-500 max-w-sm">
                      There are no payrun records matching your criteria. Click "New Payrun" to initialize a new payroll run.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* New Payrun Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogHeader>
          <DialogTitle className="text-black font-bold">New Payrun</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Initialize a new payrun cycle for computation and processing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreatePayrun} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-black">
              Payrun Name <span className="text-black">*</span>
            </label>
            <Input
              name="name"
              placeholder="e.g. September 2026 Regular Payrun"
              value={formData.name}
              onChange={handleInputChange}
              className={errors.name ? "border-black font-medium" : "border-zinc-300"}
            />
            {errors.name && (
              <p className="text-[11px] font-medium text-black">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">
                Payroll Period <span className="text-black">*</span>
              </label>
              <Input
                name="period"
                placeholder="e.g. Sept 2026"
                value={formData.period}
                onChange={handleInputChange}
                className={errors.period ? "border-black font-medium" : "border-zinc-300"}
              />
              {errors.period && (
                <p className="text-[11px] font-medium text-black">{errors.period}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">Salary Structure</label>
              <Select
                name="salaryStructure"
                value={formData.salaryStructure}
                onChange={handleInputChange}
                className="border-zinc-300 text-black"
              >
                <option value="Regular Monthly">Regular Monthly</option>
                <option value="Contractor Structure">Contractor Structure</option>
                <option value="Executive Structure">Executive Structure</option>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-black">
              Employee Count <span className="text-black">*</span>
            </label>
            <Input
              name="employeeCount"
              type="number"
              min="1"
              value={formData.employeeCount}
              onChange={handleInputChange}
              className={errors.employeeCount ? "border-black font-medium" : "border-zinc-300"}
            />
            {errors.employeeCount && (
              <p className="text-[11px] font-medium text-black">{errors.employeeCount}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="border-zinc-300 text-black hover:bg-zinc-100"
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-black hover:bg-zinc-800 text-white border border-black">
              Initialize Payrun
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}
