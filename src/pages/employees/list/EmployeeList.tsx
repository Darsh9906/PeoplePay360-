"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
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
  INITIAL_EMPLOYEES,
  DEPARTMENTS,
  CONTRACT_TYPES,
  Employee,
} from "@/src/data/mockData"
import { Plus, Search, Filter, XCircle, Mail, Phone } from "lucide-react"

export default function EmployeeList() {
  // Starts with NO dummy/fake records as requested
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES)
    useEffect(() => {
      const savedEmployees = window.localStorage.getItem("peoplepay360-employees")
      if (savedEmployees) {
        window.setTimeout(() => setEmployees(JSON.parse(savedEmployees)), 0)
      }
    }, [])

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState("ALL")
  const [selectedStatus, setSelectedStatus] = useState("ALL")
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form State for Add Employee
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "Engineering",
    position: "",
    contractType: "Full-time",
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

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    const newEmp: Employee = {
      id: `EMP-${String(employees.length + 1).padStart(3, "0")}`,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || "-",
      department: formData.department,
      position: formData.position.trim(),
      contractType: formData.contractType,
      status: formData.status,
    }

    const nextEmployees = [newEmp, ...employees]
    window.localStorage.setItem("peoplepay360-employees", JSON.stringify(nextEmployees))
    setEmployees(nextEmployees)
    setIsModalOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      department: "Engineering",
      position: "",
      contractType: "Full-time",
      status: "Active",
    })
    setErrors({})
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
              {DEPARTMENTS.map((dept) => (
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
        </div>
      </div>

      {/* Employee Table */}
      <div className="rounded-md border border-zinc-300 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 bg-zinc-50">
              <TableHead className="text-black font-semibold">Employee</TableHead>
              <TableHead className="text-black font-semibold">Email &amp; Phone</TableHead>
              <TableHead className="text-black font-semibold">Department</TableHead>
              <TableHead className="text-black font-semibold">Position</TableHead>
              <TableHead className="text-black font-semibold">Contract</TableHead>
              <TableHead className="text-black font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.length > 0 ? (
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
                              {emp.id}
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
                        {emp.phone && emp.phone !== "-" && (
                          <div className="flex items-center gap-1.5 text-zinc-500">
                            <Phone className="h-3.5 w-3.5 text-zinc-400" />
                            <span>{emp.phone}</span>
                          </div>
                        )}
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

                    <TableCell className="text-xs text-zinc-600">
                      {emp.contractType}
                    </TableCell>

                    <TableCell>
                      <Badge variant={badgeVariant}>{emp.status}</Badge>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-56 text-center">
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

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">Phone Number</label>
              <Input
                name="phone"
                placeholder="Phone number"
                value={formData.phone}
                onChange={handleInputChange}
                className="border-zinc-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">
                Department <span className="text-black">*</span>
              </label>
              <Select
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                className="border-zinc-300 text-black"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </Select>
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
              <label className="text-xs font-semibold text-black">Contract Type</label>
              <Select
                name="contractType"
                value={formData.contractType}
                onChange={handleInputChange}
                className="border-zinc-300 text-black"
              >
                {CONTRACT_TYPES.map((ct) => (
                  <option key={ct} value={ct}>
                    {ct}
                  </option>
                ))}
              </Select>
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
