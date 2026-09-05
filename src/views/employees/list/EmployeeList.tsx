"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
  Mail,
  LayoutGrid,
  List as ListIcon,
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
  department: string
}

type DepartmentApiRow = {
  id: string
  name: string
  code: string
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
    return employees.filter((emp) => {
      const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase()
      const searchLower = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !searchLower ||
        emp.firstName.toLowerCase().includes(searchLower) ||
        emp.lastName.toLowerCase().includes(searchLower) ||
        fullName.includes(searchLower) ||
        emp.email.toLowerCase().includes(searchLower)

      const matchesDepartment =
        selectedDepartment === "ALL" || emp.department === selectedDepartment
       
      const matchesStatus =
        selectedStatus === "ALL" || emp.status === selectedStatus

      return matchesSearch && matchesDepartment && matchesStatus
    })
  }, [employees, searchQuery, selectedDepartment, selectedStatus])

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
        <Button
          onClick={() => {
            resetForm()
            setIsModalOpen(true)
          }}
          className="gap-1.5 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add Employee
        </Button>
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
              <TableHead className="text-black font-semibold">Email</TableHead>
              <TableHead className="text-black font-semibold">Department</TableHead>
              <TableHead className="text-black font-semibold">Position</TableHead>
              <TableHead className="text-black font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center">
                  <p className="text-sm font-medium text-zinc-500">
                    Loading employee records...
                  </p>
                </TableCell>
              </TableRow>
            ) : loadError ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center">
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
              filteredEmployees.map((emp) => {
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

                    <TableCell>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 text-zinc-700">
                          <Mail className="h-3.5 w-3.5 text-zinc-400" />
                          <span>{emp.email}</span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-zinc-100 border border-zinc-300 px-2 py-1 text-xs font-medium text-black">
                        {emp.department}
                      </span>
                    </TableCell>

                    <TableCell className="text-sm font-medium text-black">
                      {emp.position}
                    </TableCell>

                    <TableCell>
                      <Badge variant={badgeVariant}>{emp.status}</Badge>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-56 text-center">
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
