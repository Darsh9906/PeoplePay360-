"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { apiRequest } from "@/src/lib/api"
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
import type { Employee } from "@/src/types/hr"
import {
  Plus,
  Search,
  Filter,
  XCircle,
  LayoutGrid,
  List as ListIcon,
  Upload,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"
import EmployeeKanban from "./EmployeeKanban"

type EmployeeApiRow = {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  workEmail: string
  jobTitle: string
  status: "active" | "inactive" | "terminated"
  hireDate: string
  department: string
  managerName: string | null
  scheduleName: string | null
}

type DepartmentApiRow = {
  id: string
  name: string
  code: string
}

type ImportRow = {
  row: number
  employeeCode: string
  fullName: string
  workEmail: string
  department: string
  jobTitle: string
  hireDate: string
  status: "active" | "inactive" | "terminated"
  validation: string
  valid: boolean
}

function parseCsv(text: string) {
  return text.trim().split(/\r?\n/).map((line) => {
    const values: string[] = []
    let value = ""
    let quoted = false
    for (const character of line) {
      if (character === '"') quoted = !quoted
      else if (character === "," && !quoted) { values.push(value.trim()); value = "" }
      else value += character
    }
    values.push(value.trim())
    return values
  })
}

function mapEmployeeFromApi(employee: EmployeeApiRow): Employee {
  const statusMap: Record<EmployeeApiRow["status"], Employee["status"]> = {
    active: "Active",
    inactive: "Inactive",
    terminated: "Inactive",
  }

  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.workEmail,
    department: employee.department,
    position: employee.jobTitle,
    status: statusMap[employee.status],
    hireDate: employee.hireDate,
    managerName: employee.managerName,
    scheduleName: employee.scheduleName,
  }
}

export default function EmployeeList() {
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState("ALL")
  const [selectedStatus, setSelectedStatus] = useState("ALL")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list")
  const [isAddingDepartment, setIsAddingDepartment] = useState(false)
  const [newDepartment, setNewDepartment] = useState("")
  const [sortAscending, setSortAscending] = useState(true)
  const [page, setPage] = useState(1)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const [importError, setImportError] = useState("")
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: number } | null>(null)

  const employeesQuery = useQuery({
    queryKey: ["employees"],
    queryFn: () => apiRequest<EmployeeApiRow[]>("/api/employees"),
  })
  const departmentsQuery = useQuery({
    queryKey: ["departments"],
    queryFn: () => apiRequest<DepartmentApiRow[]>("/api/departments"),
  })

  const employees = useMemo(
    () => (employeesQuery.data ?? []).map(mapEmployeeFromApi),
    [employeesQuery.data]
  )
  const departments = departmentsQuery.data ?? []
  const departmentOptions = departments.map((department) => department.name)
  const isLoading = employeesQuery.isLoading || departmentsQuery.isLoading
  const loadError = employeesQuery.error || departmentsQuery.error ? "Could not load employees from backend." : ""

  // Form State for Add Employee
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    departmentId: "",
    position: "",
    status: "Active" as "Active" | "Inactive" | "On Leave",
  })

  // Form Validation State
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Combined Search & Filter logic
  const filteredEmployees = useMemo(() => {
    const filtered = employees.filter((emp) => {
      const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase()
      const searchLower = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !searchLower ||
        emp.firstName.toLowerCase().includes(searchLower) ||
        emp.lastName.toLowerCase().includes(searchLower) ||
        fullName.includes(searchLower) ||
        emp.email.toLowerCase().includes(searchLower) ||
        emp.employeeCode?.toLowerCase().includes(searchLower)

      const matchesDepartment =
        selectedDepartment === "ALL" || emp.department === selectedDepartment
       
      const matchesStatus =
        selectedStatus === "ALL" || emp.status === selectedStatus

      return matchesSearch && matchesDepartment && matchesStatus
    })
    return [...filtered].sort((a, b) => {
      const result = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      return sortAscending ? result : -result
    })
  }, [employees, searchQuery, selectedDepartment, selectedStatus, sortAscending])

  const pageSize = 12
  const pageCount = Math.max(1, Math.ceil(filteredEmployees.length / pageSize))
  const visibleEmployees = filteredEmployees.slice((page - 1) * pageSize, page * pageSize)

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
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required"
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required"
    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Enter a valid email address"
    }
    if (!formData.position.trim()) newErrors.position = "Position is required"
    if (!formData.departmentId) newErrors.departmentId = "Department is required"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const createEmployeeMutation = useMutation({
    mutationFn: () => {
      const sequence = String((employeesQuery.data?.length ?? 0) + 1).padStart(4, "0")
      return apiRequest("/api/employees", {
        method: "POST",
        body: JSON.stringify({
          employeeCode: `EMP-${sequence}`,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          workEmail: formData.email.trim().toLowerCase(),
          departmentId: formData.departmentId,
          jobTitle: formData.position.trim(),
          status: formData.status === "Active" ? "active" : "inactive",
          hireDate: new Date().toISOString().split("T")[0],
        }),
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  })

  const createDepartmentMutation = useMutation({
    mutationFn: (name: string) => apiRequest<DepartmentApiRow>("/api/departments", {
      method: "POST",
      body: JSON.stringify({
        name,
        code: name.replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase() || "DEPT",
      }),
    }),
    onSuccess: async (department) => {
      await queryClient.invalidateQueries({ queryKey: ["departments"] })
      setFormData((current) => ({ ...current, departmentId: department.id }))
    },
  })

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    await createEmployeeMutation.mutateAsync()
    setIsModalOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      departmentId: departments[0]?.id ?? "",
      position: "",
      status: "Active",
    })
    setErrors({})
    setIsAddingDepartment(false)
    setNewDepartment("")
  }

  const addCustomDepartment = () => {
    const department = newDepartment.trim()
    if (!department || departmentOptions.includes(department)) return

    createDepartmentMutation.mutate(department)
    setNewDepartment("")
    setIsAddingDepartment(false)
  }

  const downloadTemplate = () => {
    const headers = ["Employee ID", "Full Name", "Work Email", "Phone", "Department", "Job Position", "Manager", "Joining Date", "Working Schedule", "Employment Status"]
    const blob = new Blob([`${headers.join(",")}\n`], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "peoplepay360-employee-template.csv"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleImportFile = (file: File | undefined) => {
    if (!file) return
    setImportError("")
    setImportResult(null)
    if (!/\.(csv|xlsx)$/i.test(file.name)) {
      setImportError("Please upload an Excel (.xlsx) or CSV file.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const workbook = file.name.toLowerCase().endsWith(".xlsx")
        ? XLSX.read(reader.result, { type: "array" })
        : null
      const fileText = workbook
        ? XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]])
        : String(reader.result ?? "")
      const [header, ...lines] = parseCsv(fileText)
      const indexes = new Map(header.map((name, index) => [name.toLowerCase(), index]))
      const valueAt = (values: string[], name: string) => values[indexes.get(name.toLowerCase()) ?? -1] ?? ""
      const existingCodes = new Set(employees.map((employee) => employee.employeeCode?.toLowerCase()))
      const existingEmails = new Set(employees.map((employee) => employee.email.toLowerCase()))
      const seenCodes = new Set<string>()
      const seenEmails = new Set<string>()
      const rows = lines.filter((values) => values.some(Boolean)).map((values, index): ImportRow => {
        const employeeCode = valueAt(values, "Employee ID")
        const fullName = valueAt(values, "Full Name")
        const workEmail = valueAt(values, "Work Email").toLowerCase()
        const department = valueAt(values, "Department")
        const jobTitle = valueAt(values, "Job Position")
        const hireDate = valueAt(values, "Joining Date")
        const rawStatus = valueAt(values, "Employment Status").toLowerCase()
        const status = rawStatus === "inactive" || rawStatus === "terminated" ? rawStatus : "active"
        const problems: string[] = []
        if (!employeeCode) problems.push("Employee ID is required")
        if (!fullName || fullName.trim().split(/\s+/).length < 2) problems.push("Full Name is required")
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail)) problems.push("Work Email is invalid")
        if (!department || !departments.some((item) => item.name.toLowerCase() === department.toLowerCase())) problems.push("Department is invalid")
        if (!jobTitle) problems.push("Job Position is required")
        if (!/^\d{4}-\d{2}-\d{2}$/.test(hireDate) || Number.isNaN(Date.parse(hireDate))) problems.push("Joining Date must be YYYY-MM-DD")
        if (rawStatus && !["active", "inactive", "terminated"].includes(rawStatus)) problems.push("Employment Status is invalid")
        if (existingCodes.has(employeeCode.toLowerCase()) || seenCodes.has(employeeCode.toLowerCase())) problems.push("Duplicate employee ID")
        if (existingEmails.has(workEmail) || seenEmails.has(workEmail)) problems.push("Duplicate employee email")
        seenCodes.add(employeeCode.toLowerCase()); seenEmails.add(workEmail)
        return { row: index + 2, employeeCode, fullName, workEmail, department, jobTitle, hireDate, status, validation: problems.join("; ") || "Valid", valid: problems.length === 0 }
      })
      setImportRows(rows)
    }
    if (file.name.toLowerCase().endsWith(".xlsx")) reader.readAsArrayBuffer(file)
    else reader.readAsText(file)
  }

  const runImport = async () => {
    setImporting(true)
    let imported = 0; let skipped = 0; let errors = 0
    for (const row of importRows) {
      if (!row.valid) { skipped += 1; continue }
      const [firstName, ...rest] = row.fullName.trim().split(/\s+/)
      const department = departments.find((item) => item.name.toLowerCase() === row.department.toLowerCase())
      try {
        await apiRequest("/api/employees", { method: "POST", body: JSON.stringify({ employeeCode: row.employeeCode, firstName, lastName: rest.join(" "), workEmail: row.workEmail, departmentId: department?.id, jobTitle: row.jobTitle, status: row.status, hireDate: row.hireDate }) })
        imported += 1
      } catch { errors += 1 }
    }
    setImportResult({ imported, skipped, errors })
    setImporting(false)
    await queryClient.invalidateQueries({ queryKey: ["employees"] })
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-300 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-black">
            Employees
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            Manage employee directory and department allocations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <Button variant="outline" onClick={() => setIsImportOpen(true)} className="gap-1.5"><Upload className="h-4 w-4" />Import Employees</Button>
          <Button onClick={() => { resetForm(); setIsModalOpen(true) }} className="gap-1.5"><Plus className="h-4 w-4" />Add Employee</Button>
        </div>
      </div>

      {/* Search & Filters Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white p-4 rounded-md border border-zinc-300 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search employees by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-zinc-300 focus-visible:ring-black"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-500 hidden sm:block" />
            <Select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-40 bg-white border-zinc-300 text-black"
            >
              <option value="ALL">All Departments</option>
              {departmentOptions.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </Select>
          </div>

          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-36 bg-white border-zinc-300 text-black"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="On Leave">On Leave</option>
          </Select>

          {(searchQuery || selectedDepartment !== "ALL" || selectedStatus !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("")
                setSelectedDepartment("ALL")
                setSelectedStatus("ALL")
              }}
              className="text-xs text-zinc-600 hover:text-black"
            >
              Reset Filters
            </Button>
          )}

          {/* List / Kanban view switch */}
          <div className="flex items-center rounded-md border border-zinc-300 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              aria-pressed={viewMode === "list"}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold transition ${
                viewMode === "list"
                  ? "bg-black text-white"
                  : "text-zinc-600 hover:text-black"
              }`}
            >
              <ListIcon className="h-3.5 w-3.5" />
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              aria-pressed={viewMode === "kanban"}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold transition ${
                viewMode === "kanban"
                  ? "bg-black text-white"
                  : "text-zinc-600 hover:text-black"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Kanban
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setSortAscending((value) => !value); setPage(1) }} className="gap-1.5"><ArrowUpDown className="h-3.5 w-3.5" />Name</Button>
        </div>
      </div>

      {/* Employee records — list or kanban */}
      {viewMode === "kanban" ? (
        <EmployeeKanban employees={filteredEmployees} />
      ) : (
      <div className="rounded-md border border-zinc-300 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 bg-zinc-50">
              <TableHead className="text-black font-semibold">Employee</TableHead>
              <TableHead className="hidden text-black font-semibold lg:table-cell">Job Position</TableHead>
              <TableHead className="text-black font-semibold">Department</TableHead>
              <TableHead className="hidden text-black font-semibold xl:table-cell">Manager</TableHead>
              <TableHead className="hidden text-black font-semibold xl:table-cell">Schedule</TableHead>
              <TableHead className="hidden text-black font-semibold md:table-cell">Joining Date</TableHead>
              <TableHead className="text-black font-semibold">Status</TableHead>
              <TableHead className="text-right text-black font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-40 text-center">
                  <p className="text-sm font-medium text-zinc-500">
                    Loading employee records...
                  </p>
                </TableCell>
              </TableRow>
            ) : loadError ? (
              <TableRow>
                <TableCell colSpan={8} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center text-zinc-500 space-y-2 py-6">
                    <XCircle className="h-10 w-10 text-zinc-300" />
                    <p className="text-base font-semibold text-black">
                      Backend data unavailable
                    </p>
                    <p className="text-xs text-zinc-500 max-w-sm">
                      {loadError}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredEmployees.length > 0 ? (
              visibleEmployees.map((emp) => {
                const badgeVariant =
                  emp.status === "Active"
                    ? "active"
                    : emp.status === "On Leave"
                    ? "onleave"
                    : "inactive"

                return (
                  <TableRow key={emp.id} className="border-zinc-200 hover:bg-zinc-50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Link href={`/employees/${emp.id}`} className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black">
                          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-100 text-black font-bold text-xs border border-zinc-300">
                            {emp.firstName[0]}
                            {emp.lastName[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-black hover:underline">
                              {emp.firstName} {emp.lastName}
                            </div>
                            <div className="text-xs text-zinc-500 font-mono">
                              {emp.employeeCode ?? emp.id}
                            </div>
                          </div>
                        </Link>
                      </div>
                    </TableCell>

                    <TableCell className="hidden lg:table-cell text-sm font-medium text-black">
                      {emp.position}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-zinc-100 border border-zinc-300 px-2 py-1 text-xs font-medium text-black">
                        {emp.department}
                      </span>
                    </TableCell>

                    <TableCell className="hidden xl:table-cell text-sm text-zinc-600">{emp.managerName ?? "Not assigned"}</TableCell>
                    <TableCell className="hidden xl:table-cell text-xs text-zinc-600">{emp.scheduleName ?? "Not assigned"}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-zinc-600">{emp.hireDate}</TableCell>
                    <TableCell>
                      <Badge variant={badgeVariant}>{emp.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right"><Link href={`/employees/${emp.id}`} className="inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 hover:text-black">Open</Link></TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-56 text-center">
                  <div className="flex flex-col items-center justify-center text-zinc-500 space-y-2 py-6">
                    <XCircle className="h-10 w-10 text-zinc-300" />
                    <p className="text-base font-semibold text-black">
                      No employees found
                    </p>
                    <p className="text-xs text-zinc-500 max-w-sm">
                      There are no employee records to display. Use the &quot;Add Employee&quot; button above to add an employee.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      )}

      {!isLoading && !loadError && pageCount > 1 && (
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredEmployees.length)} of {filteredEmployees.length}</span>
          <div className="flex items-center gap-2"><Button variant="outline" size="icon-sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)} aria-label="Previous page"><ChevronLeft /></Button><span>Page {page} of {pageCount}</span><Button variant="outline" size="icon-sm" disabled={page === pageCount} onClick={() => setPage((value) => value + 1)} aria-label="Next page"><ChevronRight /></Button></div>
        </div>
      )}

      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen} className="max-w-5xl">
        <DialogHeader><DialogTitle>Import Employee Data</DialogTitle><DialogDescription>Upload an Excel or CSV file containing employee records. CSV is supported directly; use the template for the expected columns.</DialogDescription></DialogHeader>
        {importResult ? <div className="space-y-5"><div className="flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-4"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><div><p className="font-semibold text-black">Import Complete</p><p className="text-sm text-zinc-600">Successfully imported: {importResult.imported} | Skipped: {importResult.skipped} | Errors: {importResult.errors}</p></div></div><DialogFooter><Button variant="outline" onClick={() => { setImportRows([]); setImportResult(null) }}>Import Another File</Button><Button onClick={() => setIsImportOpen(false)}>Done</Button></DialogFooter></div> : <div className="space-y-4"><label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-zinc-400 bg-zinc-50 px-6 py-10 text-center hover:bg-zinc-100"><Upload className="h-6 w-6 text-zinc-500" /><span className="font-semibold text-black">Choose Excel or CSV file</span><span className="text-xs text-zinc-500">Upload an Excel or CSV file containing employee records.</span><input type="file" accept=".csv,.xlsx" className="sr-only" onChange={(event) => handleImportFile(event.target.files?.[0])} /></label><Button type="button" variant="outline" onClick={downloadTemplate}>Download Template</Button>{importError && <p className="text-sm font-medium text-red-700">{importError}</p>}{importRows.length > 0 && <><div className="grid gap-2 sm:grid-cols-4"><div className="rounded border p-3"><p className="text-xs text-zinc-500">Total rows</p><p className="text-xl font-semibold">{importRows.length}</p></div><div className="rounded border p-3"><p className="text-xs text-zinc-500">Valid rows</p><p className="text-xl font-semibold text-emerald-700">{importRows.filter((row) => row.valid).length}</p></div><div className="rounded border p-3"><p className="text-xs text-zinc-500">Rows with errors</p><p className="text-xl font-semibold text-red-700">{importRows.filter((row) => !row.valid).length}</p></div><div className="rounded border p-3"><p className="text-xs text-zinc-500">Duplicate rows</p><p className="text-xl font-semibold">{importRows.filter((row) => row.validation.toLowerCase().includes("duplicate")).length}</p></div></div><div className="max-h-64 overflow-auto rounded-md border"><Table><TableHeader><TableRow><TableHead>Row</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Department</TableHead><TableHead>Position</TableHead><TableHead>Validation</TableHead></TableRow></TableHeader><TableBody>{importRows.map((row) => <TableRow key={row.row}><TableCell>{row.row}</TableCell><TableCell>{row.fullName}</TableCell><TableCell>{row.workEmail}</TableCell><TableCell>{row.department}</TableCell><TableCell>{row.jobTitle}</TableCell><TableCell className={row.valid ? "text-emerald-700" : "text-red-700"}>{row.valid ? "Valid" : <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{row.validation}</span>}</TableCell></TableRow>)}</TableBody></Table></div><DialogFooter><Button variant="outline" onClick={() => setIsImportOpen(false)}>Cancel</Button><Button disabled={importing || !importRows.some((row) => row.valid)} onClick={runImport}>{importing ? "Importing..." : "Import Valid Rows"}</Button></DialogFooter></>}</div>}
      </Dialog>

      {/* Add Employee Modal / Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogHeader>
          <DialogTitle className="text-black font-semibold">Add New Employee</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Enter employee details below to add a record to your active session.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAddEmployee} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">
                First Name <span className="text-black">*</span>
              </label>
              <Input
                name="firstName"
                placeholder="First name"
                value={formData.firstName}
                onChange={handleInputChange}
                className={errors.firstName ? "border-black font-medium" : "border-zinc-300"}
              />
              {errors.firstName && (
                <p className="text-[11px] font-medium text-black">{errors.firstName}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">
                Last Name <span className="text-black">*</span>
              </label>
              <Input
                name="lastName"
                placeholder="Last name"
                value={formData.lastName}
                onChange={handleInputChange}
                className={errors.lastName ? "border-black font-medium" : "border-zinc-300"}
              />
              {errors.lastName && (
                <p className="text-[11px] font-medium text-black">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">
                Email Address <span className="text-black">*</span>
              </label>
              <Input
                name="email"
                type="email"
                placeholder="email@example.com"
                value={formData.email}
                onChange={handleInputChange}
                className={errors.email ? "border-black font-medium" : "border-zinc-300"}
              />
              {errors.email && (
                <p className="text-[11px] font-medium text-black">{errors.email}</p>
              )}
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">
                Department <span className="text-black">*</span>
              </label>
              <Select
                name="departmentId"
                value={formData.departmentId}
                onChange={(event) => {
                  if (event.target.value === "__add_custom__") {
                    setIsAddingDepartment(true)
                    setFormData((current) => ({ ...current, departmentId: "" }))
                  } else {
                    handleInputChange(event)
                  }
                }}
                className="border-zinc-300 text-black"
              >
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
                <option value="__add_custom__">+ Add custom department</option>
              </Select>
              {errors.departmentId && (
                <p className="text-[11px] font-medium text-black">{errors.departmentId}</p>
              )}
              {isAddingDepartment && (
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    value={newDepartment}
                    onChange={(event) => setNewDepartment(event.target.value)}
                    placeholder="e.g. Customer Success"
                    className="border-zinc-300"
                  />
                  <Button type="button" size="sm" onClick={addCustomDepartment}>
                    Add
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">
                Position / Job Title <span className="text-black">*</span>
              </label>
              <Input
                name="position"
                placeholder="Job title"
                value={formData.position}
                onChange={handleInputChange}
                className={errors.position ? "border-black font-medium" : "border-zinc-300"}
              />
              {errors.position && (
                <p className="text-[11px] font-medium text-black">{errors.position}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <option value="On Leave">On Leave</option>
              </Select>
            </div>
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
              Save Employee
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}
