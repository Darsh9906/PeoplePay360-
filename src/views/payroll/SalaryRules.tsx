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
import { Plus, Search, Filter, ArrowLeft, Eye, ListChecks, Layers } from "lucide-react"

export default function SalaryRules() {
  const { rules, structures, addSalaryRule } = usePayroll()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("ALL")
  const [selectedStructure, setSelectedStructure] = useState("ALL")
  const [selectedStatus] = useState("ALL")
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form State for Add Rule
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    sequence: 1,
    category: "Basic" as "Basic" | "Allowance" | "Gross" | "Deduction" | "Net",
    calculationType: "Fixed Amount" as "Percentage" | "Fixed Amount" | "Formula",
    structureId: "",
    amountOrPercentage: "",
    percentageBaseCode: "WAGE",
    description: "",
    status: "Active" as "Active" | "Inactive",
  })

  // Validation State
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Combined Search & Filter
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      const searchLower = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !searchLower ||
        r.name.toLowerCase().includes(searchLower) ||
        r.code.toLowerCase().includes(searchLower) ||
        r.id.toLowerCase().includes(searchLower)

      const matchesCategory =
        selectedCategory === "ALL" || r.category === selectedCategory

      const matchesStructure =
        selectedStructure === "ALL" || r.structureId === selectedStructure

      const matchesStatus =
        selectedStatus === "ALL" || r.status === selectedStatus

      return matchesSearch && matchesCategory && matchesStructure && matchesStatus
    })
  }, [rules, searchQuery, selectedCategory, selectedStructure, selectedStatus])

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
    if (!formData.name.trim()) newErrors.name = "Rule name is required"
    if (!formData.code.trim()) newErrors.code = "Rule code is required"
    if (!formData.structureId) newErrors.structureId = "Target structure is required"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    const matchedStruct = structures.find((s) => s.id === formData.structureId)

    addSalaryRule({
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      sequence: Number(formData.sequence) || 1,
      category: formData.category,
      calculationType: formData.calculationType,
      structureId: formData.structureId,
      structureName: matchedStruct ? matchedStruct.name : "General",
      amountOrPercentage: formData.amountOrPercentage.trim(),
      percentageBaseCode: formData.percentageBaseCode,
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
      sequence: rules.length + 1,
      category: "Basic",
      calculationType: "Fixed Amount",
      percentageBaseCode: "WAGE",
      structureId: structures[0]?.id || "",
      amountOrPercentage: "",
      description: "",
      status: "Active",
    })
    setErrors({})
  }

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/payroll/structures" className="hover:text-black transition flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          Salary Structures
        </Link>
        <span>/</span>
        <span className="text-black font-medium">Salary Rules</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Salary Rules
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Define salary calculation rules, allowances, deductions, and sequence rules.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link href="/payroll/structures">
            <Button variant="outline" className="border-zinc-300 text-black hover:bg-zinc-100 text-xs gap-1">
              <Layers className="h-3.5 w-3.5" />
              Salary Structures
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
            Add Salary Rule
          </Button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white p-4 rounded-xl border border-zinc-300 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search rules by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-zinc-300 focus-visible:ring-black"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-500 hidden sm:block" />
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-36 bg-white border-zinc-300 text-black"
            >
              <option value="ALL">All Categories</option>
              <option value="Basic">Basic</option>
              <option value="Allowance">Allowance</option>
              <option value="Gross">Gross</option>
              <option value="Deduction">Deduction</option>
              <option value="Net">Net</option>
            </Select>
          </div>

          <Select
            value={selectedStructure}
            onChange={(e) => setSelectedStructure(e.target.value)}
            className="w-40 bg-white border-zinc-300 text-black"
          >
            <option value="ALL">All Structures</option>
            {structures.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </Select>

          {(searchQuery || selectedCategory !== "ALL" || selectedStructure !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("")
                setSelectedCategory("ALL")
                setSelectedStructure("ALL")
              }}
              className="text-xs text-zinc-600 hover:text-black"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Salary Rules Table */}
      <div className="rounded-xl border border-zinc-300 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 bg-zinc-50">
              <TableHead className="text-black font-semibold">Sequence</TableHead>
              <TableHead className="text-black font-semibold">Rule Name</TableHead>
              <TableHead className="text-black font-semibold">Code</TableHead>
              <TableHead className="text-black font-semibold">Category</TableHead>
              <TableHead className="text-black font-semibold">Calculation Type</TableHead>
              <TableHead className="text-black font-semibold">Structure</TableHead>
              <TableHead className="text-black font-semibold">Status</TableHead>
              <TableHead className="text-black font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRules.length > 0 ? (
              filteredRules.map((rule) => (
                <TableRow key={rule.id} className="border-zinc-200 hover:bg-zinc-50">
                  <TableCell className="font-mono font-bold text-black">
                    #{rule.sequence}
                  </TableCell>

                  <TableCell className="font-semibold text-black">
                    <div>
                      {rule.name}
                    </div>
                  </TableCell>

                  <TableCell className="text-xs font-mono font-bold text-black">
                    {rule.code}
                  </TableCell>

                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-zinc-100 border border-zinc-300 px-2 py-0.5 text-xs font-medium text-black">
                      {rule.category}
                    </span>
                  </TableCell>

                  <TableCell className="text-xs text-zinc-700 font-medium">
                    {rule.calculationType}
                  </TableCell>

                  <TableCell className="text-xs text-zinc-700">
                    {rule.structureName}
                  </TableCell>

                  <TableCell>
                    <Badge variant={rule.status === "Active" ? "active" : "inactive"}>
                      {rule.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <Link href={`/payroll/rules/${rule.id}`}>
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
                <TableCell colSpan={8} className="h-56 text-center">
                  <div className="flex flex-col items-center justify-center text-zinc-500 space-y-2 py-6">
                    <ListChecks className="h-10 w-10 text-zinc-300" />
                    <p className="text-base font-bold text-black">
                      No salary rules found
                    </p>
                    <p className="text-xs text-zinc-500 max-w-sm">
                      There are no salary rules created yet. Click &quot;Add Salary Rule&quot; to define calculation rules.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Rule Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogHeader>
          <DialogTitle className="text-black font-bold">Add Salary Rule</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Define calculation rules and link them to a salary structure.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateRule} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">
                Rule Name <span className="text-black">*</span>
              </label>
              <Input
                name="name"
                placeholder="e.g. Basic Salary Calculation"
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
                Rule Code <span className="text-black">*</span>
              </label>
              <Input
                name="code"
                placeholder="e.g. BASIC_SAL"
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
              <label className="text-xs font-semibold text-black">
                Sequence Order <span className="text-black">*</span>
              </label>
              <Input
                name="sequence"
                type="number"
                min="1"
                value={formData.sequence}
                onChange={handleInputChange}
                className="border-zinc-300 text-black"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">
                Target Structure <span className="text-black">*</span>
              </label>
              <Select
                name="structureId"
                value={formData.structureId}
                onChange={handleInputChange}
                className={errors.structureId ? "border-black font-medium" : "border-zinc-300 text-black"}
              >
                <option value="">Select Structure...</option>
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </Select>
              {errors.structureId && (
                <p className="text-[11px] font-medium text-black">{errors.structureId}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">Category</label>
              <Select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="border-zinc-300 text-black"
              >
                <option value="Basic">Basic</option>
                <option value="Allowance">Allowance</option>
                <option value="Gross">Gross</option>
                <option value="Deduction">Deduction</option>
                <option value="Net">Net</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">Calculation Type</label>
              <Select
                name="calculationType"
                value={formData.calculationType}
                onChange={handleInputChange}
                className="border-zinc-300 text-black"
              >
                <option value="Fixed Amount">Fixed Amount</option>
                <option value="Percentage">Percentage</option>
                <option value="Formula">Formula</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">
                {formData.calculationType === "Percentage"
                  ? "Percentage"
                  : "Amount"}
              </label>
              <Input
                name="amountOrPercentage"
                placeholder={
                  formData.calculationType === "Percentage" ? "e.g. 50" : "e.g. 1600"
                }
                value={formData.amountOrPercentage}
                onChange={handleInputChange}
                className="border-zinc-300 text-black"
              />
            </div>

            {formData.calculationType === "Percentage" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-black">
                  Percentage of
                </label>
                <Select
                  name="percentageBaseCode"
                  value={formData.percentageBaseCode}
                  onChange={handleInputChange}
                  className="border-zinc-300 text-black"
                >
                  <option value="WAGE">WAGE — prorated contract wage</option>
                  <option value="FULL_WAGE">FULL_WAGE — unprorated wage</option>
                  <option value="BASIC">BASIC — basic salary</option>
                  <option value="GROSS">GROSS — gross salary</option>
                  {rules
                    .filter(
                      (rule) =>
                        rule.structureId === formData.structureId &&
                        !["WAGE", "FULL_WAGE", "BASIC", "GROSS"].includes(rule.code),
                    )
                    .map((rule) => (
                      <option key={rule.id} value={rule.code}>
                        {rule.code} — {rule.name}
                      </option>
                    ))}
                </Select>
                <p className="text-[11px] text-zinc-500">
                  The base must be computed by an earlier sequence number.
                </p>
              </div>
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
              Save Salary Rule
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}
