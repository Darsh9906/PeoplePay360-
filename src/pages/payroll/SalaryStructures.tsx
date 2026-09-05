"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { usePayroll, SalaryStructureRecord } from "@/src/context/PayrollContext"
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
import { Plus, Search, Filter, XCircle, ArrowLeft, Eye, Layers, ListChecks } from "lucide-react"

export default function SalaryStructures() {
  const { structures, addSalaryStructure } = usePayroll()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("ALL")
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form State for Add Structure
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    department: "General",
    description: "",
    status: "Active" as "Active" | "Inactive",
  })

  // Validation State
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Filtered Structures
  const filteredStructures = useMemo(() => {
    return structures.filter((s) => {
      const searchLower = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !searchLower ||
        s.name.toLowerCase().includes(searchLower) ||
        s.code.toLowerCase().includes(searchLower) ||
        s.id.toLowerCase().includes(searchLower)

      const matchesStatus =
        selectedStatus === "ALL" || s.status === selectedStatus

      return matchesSearch && matchesStatus
    })
  }, [structures, searchQuery, selectedStatus])

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
    if (!formData.name.trim()) newErrors.name = "Structure name is required"
    if (!formData.code.trim()) newErrors.code = "Structure code is required"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreateStructure = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    addSalaryStructure({
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      department: formData.department,
      description: formData.description.trim(),
      status: formData.status,
    })

    setIsModalOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      department: "General",
      description: "",
      status: "Active",
    })
    setErrors({})
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
        <span className="text-black font-medium">Salary Structures</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Salary Structures
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Configure compensation structures, rule templates, and salary grade categories.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link href="/payroll/rules">
            <Button variant="outline" className="border-zinc-300 text-black hover:bg-zinc-100 text-xs gap-1">
              <ListChecks className="h-3.5 w-3.5" />
              Salary Rules
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
            Add Structure
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white p-4 rounded-xl border border-zinc-300 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search structure by name or code..."
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
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
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

      {/* Table */}
      <div className="rounded-xl border border-zinc-300 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 bg-zinc-50">
              <TableHead className="text-black font-semibold">Structure Name</TableHead>
              <TableHead className="text-black font-semibold">Code</TableHead>
              <TableHead className="text-black font-semibold">Department</TableHead>
              <TableHead className="text-black font-semibold">Salary Rules</TableHead>
              <TableHead className="text-black font-semibold">Status</TableHead>
              <TableHead className="text-black font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStructures.length > 0 ? (
              filteredStructures.map((s) => (
                <TableRow key={s.id} className="border-zinc-200 hover:bg-zinc-50">
                  <TableCell className="font-semibold text-black">
                    <div>
                      {s.name}
                      <div className="text-xs text-zinc-500 font-mono font-normal">
                        {s.id}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-xs font-mono font-bold text-black">
                    {s.code}
                  </TableCell>

                  <TableCell className="text-xs text-zinc-700 font-medium">
                    {s.department || "General"}
                  </TableCell>

                  <TableCell className="text-xs font-medium text-black">
                    {s.ruleCount} rule(s)
                  </TableCell>

                  <TableCell>
                    <Badge variant={s.status === "Active" ? "active" : "inactive"}>
                      {s.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <Link href={`/payroll/structures/${s.id}`}>
                      <Button size="sm" variant="outline" className="text-xs border-zinc-300 text-black hover:bg-zinc-100 gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        View Details
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-56 text-center">
                  <div className="flex flex-col items-center justify-center text-zinc-500 space-y-2 py-6">
                    <Layers className="h-10 w-10 text-zinc-300" />
                    <p className="text-base font-bold text-black">
                      No salary structures found
                    </p>
                    <p className="text-xs text-zinc-500 max-w-sm">
                      There are no salary structures created yet. Click "Add Structure" to create a new compensation structure.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Structure Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogHeader>
          <DialogTitle className="text-black font-bold">Add Salary Structure</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Define a salary structure category for compensation rules.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateStructure} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">
                Structure Name <span className="text-black">*</span>
              </label>
              <Input
                name="name"
                placeholder="e.g. Regular Executive Structure"
                value={formData.name}
                onChange={handleInputChange}
                className={errors.name ? "border-black font-medium" : "border-zinc-300"}
              />
              {errors.name && (
                <p className="text-[11px] font-medium text-black">{errors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">
                Structure Code <span className="text-black">*</span>
              </label>
              <Input
                name="code"
                placeholder="e.g. STR-REG"
                value={formData.code}
                onChange={handleInputChange}
                className={errors.code ? "border-black font-medium" : "border-zinc-300"}
              />
              {errors.code && (
                <p className="text-[11px] font-medium text-black">{errors.code}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">Department</label>
              <Input
                name="department"
                placeholder="e.g. Engineering / General"
                value={formData.department}
                onChange={handleInputChange}
                className="border-zinc-300 text-black"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">Status</label>
              <Select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="border-zinc-300 text-black"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-black">Description</label>
            <Input
              name="description"
              placeholder="e.g. Standard monthly salary structure for full-time staff"
              value={formData.description}
              onChange={handleInputChange}
              className="border-zinc-300 text-black"
            />
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
              Save Structure
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}
