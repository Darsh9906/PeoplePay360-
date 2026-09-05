"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Mail,
  Pencil,
  Phone,
  UserRound,
  WalletCards,
  Wallet,
  Save,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const tabs = ["Overview", "Contracts", "Attendance", "Time Off", "Allocations", "Payslips"]

function initials(name) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2)
}

function formatDate(value) {
  if (!value) return "Ongoing"
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

function formatTime(value) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function formatINR(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function formatStatus(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1).replace("_", " ") : "-"
}

function statusVariant(status) {
  return status === "active" || status === "validated" || status === "paid" ? "active" : "inactive"
}

function OverviewTab({ employee }) {
  const activeContract = employee.contracts?.find((contract) => contract.status === "active")

  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <Card className="border-zinc-300 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-200 p-5">
          <h2 className="font-semibold text-black">Employment Snapshot</h2>
          <p className="mt-1 text-xs text-zinc-500">Current role and reporting details</p>
        </CardHeader>
        <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
          <div><p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Current Position</p><p className="mt-1 font-medium text-black">{employee.jobTitle}</p><p className="mt-1 text-xs text-zinc-500">{employee.department}</p></div>
          <div><p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Reporting Manager</p><p className="mt-1 font-medium text-black">{employee.managerName ?? "Not assigned"}</p><p className="mt-1 text-xs text-zinc-500">{employee.managerName ? "Reports to" : "Manager can be linked later"}</p></div>
          <div><p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Joining Date</p><p className="mt-1 font-medium text-black">{formatDate(employee.hireDate)}</p><p className="mt-1 text-xs text-zinc-500">Stored from employee profile</p></div>
          <div><p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Current Salary</p><p className="mt-1 font-medium text-black">{activeContract ? formatINR(activeContract.monthlyWage) : "No active contract"}</p><p className="mt-1 text-xs text-zinc-500">{activeContract ? "From the active contract" : "Add a contract to set pay"}</p></div>
          <div><p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Working Schedule</p><p className="mt-1 font-medium text-black">{employee.workingSchedule?.name ?? "Not assigned"}</p><p className="mt-1 text-xs text-zinc-500">{employee.workingSchedule ? `${Number(employee.workingSchedule.weeklyHours).toFixed(2)} hrs per week` : "Assign a schedule for payroll expectations"}</p></div>
          <div><p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Status</p><div className="mt-1"><Badge variant={employee.status === "active" ? "active" : "inactive"}>{formatStatus(employee.status)}</Badge></div><p className="mt-1 text-xs text-zinc-500">Employee record state</p></div>
        </CardContent>
      </Card>

      <Card className="border-zinc-300 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-200 p-5">
          <h2 className="font-semibold text-black">Activity Overview</h2>
          <p className="mt-1 text-xs text-zinc-500">Recent employee activity</p>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-black" /><div><p className="text-sm font-medium text-black">{employee.attendance.length} attendance records</p><p className="text-xs text-zinc-500">Latest records returned from backend</p></div></div>
          <div className="flex items-start gap-3"><FileText className="mt-0.5 h-4 w-4 text-zinc-500" /><div><p className="text-sm font-medium text-black">{employee.contracts.length} contract records</p><p className="text-xs text-zinc-500">{activeContract ? "Active contract available" : "No active contract found"}</p></div></div>
          <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 h-4 w-4 text-zinc-500" /><div><p className="text-sm font-medium text-black">{employee.timeOff.length} time-off requests</p><p className="text-xs text-zinc-500">Approved and submitted requests</p></div></div>
        </CardContent>
      </Card>
    </div>
  )
}

function EmptyTab({ title, description, icon: Icon }) {
  return (
    <Card className="border-zinc-300 bg-white shadow-sm">
      <CardContent className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-zinc-100 text-zinc-500"><Icon className="h-5 w-5" /></span>
        <h2 className="font-semibold text-black">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-zinc-500">{description}</p>
        <Badge className="mt-4" variant="outline">No records</Badge>
      </CardContent>
    </Card>
  )
}

function ContractsTab({ contracts }) {
  if (contracts.length === 0) return <EmptyTab icon={FileText} title="No contracts" description="Employment agreements for this employee will appear here." />

  return (
    <Card className="border-zinc-300 bg-white shadow-sm">
      <CardHeader className="border-b border-zinc-200 p-5"><h2 className="font-semibold text-black">Contracts</h2><p className="mt-1 text-xs text-zinc-500">Employment agreements for this employee</p></CardHeader>
      <CardContent className="p-0">
        <Table><TableHeader><TableRow className="border-zinc-200 bg-zinc-50"><TableHead className="text-zinc-600">Salary</TableHead><TableHead className="text-zinc-600">Start Date</TableHead><TableHead className="text-zinc-600">End Date</TableHead><TableHead className="text-zinc-600">Status</TableHead></TableRow></TableHeader><TableBody>{contracts.map((contract) => <TableRow key={contract.id} className="border-zinc-200"><TableCell className="font-medium text-black">{formatINR(contract.monthlyWage)}</TableCell><TableCell className="text-zinc-600">{formatDate(contract.startDate)}</TableCell><TableCell className="text-zinc-600">{formatDate(contract.endDate)}</TableCell><TableCell><Badge variant={statusVariant(contract.status)}>{formatStatus(contract.status)}</Badge></TableCell></TableRow>)}</TableBody></Table>
      </CardContent>
    </Card>
  )
}

function AttendanceTab({ attendance }) {
  if (attendance.length === 0) return <EmptyTab icon={Clock3} title="No attendance records" description="Attendance history, working hours, and exceptions will appear here." />

  return (
    <Card className="border-zinc-300 bg-white shadow-sm">
      <CardHeader className="border-b border-zinc-200 p-5"><h2 className="font-semibold text-black">Attendance</h2><p className="mt-1 text-xs text-zinc-500">Latest attendance records</p></CardHeader>
      <CardContent className="p-0">
        <Table><TableHeader><TableRow className="border-zinc-200 bg-zinc-50"><TableHead className="text-zinc-600">Date</TableHead><TableHead className="text-zinc-600">Check In</TableHead><TableHead className="text-zinc-600">Check Out</TableHead><TableHead className="text-zinc-600">Hours</TableHead><TableHead className="text-zinc-600">Status</TableHead></TableRow></TableHeader><TableBody>{attendance.map((record) => <TableRow key={record.id} className="border-zinc-200"><TableCell className="font-medium text-black">{formatDate(record.attendanceDate)}</TableCell><TableCell className="text-zinc-600">{formatTime(record.checkIn)}</TableCell><TableCell className="text-zinc-600">{formatTime(record.checkOut)}</TableCell><TableCell className="text-zinc-600">{record.workedHours}</TableCell><TableCell><Badge variant={record.status === "present" ? "active" : "inactive"}>{formatStatus(record.status)}</Badge></TableCell></TableRow>)}</TableBody></Table>
      </CardContent>
    </Card>
  )
}

function TimeOffTab({ timeOff }) {
  if (timeOff.length === 0) return <EmptyTab icon={CalendarDays} title="No time off" description="Leave balances and requests for this employee will appear here." />

  return (
    <Card className="border-zinc-300 bg-white shadow-sm">
      <CardHeader className="border-b border-zinc-200 p-5"><h2 className="font-semibold text-black">Time Off</h2><p className="mt-1 text-xs text-zinc-500">Leave requests for this employee</p></CardHeader>
      <CardContent className="p-0">
        <Table><TableHeader><TableRow className="border-zinc-200 bg-zinc-50"><TableHead className="text-zinc-600">Type</TableHead><TableHead className="text-zinc-600">Period</TableHead><TableHead className="text-zinc-600">Days</TableHead><TableHead className="text-zinc-600">Status</TableHead></TableRow></TableHeader><TableBody>{timeOff.map((request) => <TableRow key={request.id} className="border-zinc-200"><TableCell className="font-medium text-black">{request.typeName}</TableCell><TableCell className="text-zinc-600">{formatDate(request.startDate)} to {formatDate(request.endDate)}</TableCell><TableCell className="text-zinc-600">{request.durationDays}</TableCell><TableCell><Badge variant={request.status === "approved" ? "active" : "draft"}>{formatStatus(request.status)}</Badge></TableCell></TableRow>)}</TableBody></Table>
      </CardContent>
    </Card>
  )
}

function AllocationsTab({ allocations }) {
  if (!allocations || allocations.length === 0) return <EmptyTab icon={Wallet} title="No leave allocations" description="Approved leave balances for this employee will appear here." />

  return (
    <Card className="border-zinc-300 bg-white shadow-sm">
      <CardHeader className="border-b border-zinc-200 p-5"><h2 className="font-semibold text-black">Leave Allocations</h2><p className="mt-1 text-xs text-zinc-500">Balances, days taken, and validity periods</p></CardHeader>
      <CardContent className="p-0">
        <Table><TableHeader><TableRow className="border-zinc-200 bg-zinc-50"><TableHead className="text-zinc-600">Type</TableHead><TableHead className="text-zinc-600">Allocated</TableHead><TableHead className="text-zinc-600">Taken</TableHead><TableHead className="text-zinc-600">Remaining</TableHead><TableHead className="text-zinc-600">Validity</TableHead><TableHead className="text-zinc-600">Status</TableHead></TableRow></TableHeader><TableBody>{allocations.map((allocation) => <TableRow key={allocation.id} className="border-zinc-200"><TableCell><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full border border-zinc-300" style={{ backgroundColor: allocation.colorHex }} /><span className="font-medium text-black">{allocation.typeName}</span></div></TableCell><TableCell className="tabular-nums text-zinc-600">{Number(allocation.allocatedDays).toFixed(1)}</TableCell><TableCell className="tabular-nums text-zinc-600">{Number(allocation.consumedDays).toFixed(1)}</TableCell><TableCell className="font-semibold tabular-nums text-black">{Number(allocation.remainingDays).toFixed(1)}</TableCell><TableCell className="font-mono text-[11px] text-zinc-600">{allocation.validFrom} to {allocation.validTo ?? "open"}</TableCell><TableCell><Badge variant={allocation.status === "approved" ? "active" : "draft"}>{formatStatus(allocation.status)}</Badge></TableCell></TableRow>)}</TableBody></Table>
      </CardContent>
    </Card>
  )
}

function PayslipsTab({ payslips }) {
  if (payslips.length === 0) return <EmptyTab icon={WalletCards} title="No payslips" description="Monthly payslips and payroll breakdowns will appear here." />

  return (
    <Card className="border-zinc-300 bg-white shadow-sm">
      <CardHeader className="border-b border-zinc-200 p-5"><h2 className="font-semibold text-black">Payslips</h2><p className="mt-1 text-xs text-zinc-500">Recent payroll results</p></CardHeader>
      <CardContent className="p-0">
        <Table><TableHeader><TableRow className="border-zinc-200 bg-zinc-50"><TableHead className="text-zinc-600">Worked Days</TableHead><TableHead className="text-zinc-600">Gross</TableHead><TableHead className="text-zinc-600">Deductions</TableHead><TableHead className="text-zinc-600">Net Pay</TableHead><TableHead className="text-zinc-600">Status</TableHead></TableRow></TableHeader><TableBody>{payslips.map((payslip) => <TableRow key={payslip.id} className="border-zinc-200"><TableCell className="font-medium text-black">{payslip.workedDays}</TableCell><TableCell className="text-zinc-600">{formatINR(payslip.grossPay)}</TableCell><TableCell className="text-zinc-600">{formatINR(payslip.totalDeductions)}</TableCell><TableCell className="font-semibold text-black">{formatINR(payslip.netPay)}</TableCell><TableCell><Badge variant={statusVariant(payslip.status)}>{formatStatus(payslip.status)}</Badge></TableCell></TableRow>)}</TableBody></Table>
      </CardContent>
    </Card>
  )
}

export default function Employee360() {
  const router = useRouter()
  const params = useParams()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id
  const [employee, setEmployee] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [activeTab, setActiveTab] = useState("Overview")
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [saveError, setSaveError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [departments, setDepartments] = useState([])

  const loadEmployee = useCallback(
    async (signal) => {
      if (!id) return
      try {
        setIsLoading(true)
        setLoadError("")

        let response = await fetch(`/api/employees/${id}`, {
          signal,
        })

        if (!response.ok) {
          const listResponse = await fetch("/api/employees", { signal })
          const listPayload = listResponse.ok
            ? await listResponse.json().catch(() => null)
            : null
          const fallbackEmployee = listPayload?.data?.find(
            (row) => row.id === id || row.employeeCode === id,
          )

          if (fallbackEmployee?.id && fallbackEmployee.id !== id) {
            response = await fetch(`/api/employees/${fallbackEmployee.id}`, {
              signal,
            })
          }

          if (!response.ok) {
            const payload = await response.json().catch(() => null)
            throw new Error(payload?.error ?? "Unable to load employee")
          }
        }

        const payload = await response.json()
        setEmployee(payload.data)
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }

        setLoadError(
          error instanceof Error
            ? error.message
            : "Could not load employee details from backend.",
        )
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false)
        }
      }
    },
    [id],
  )

  useEffect(() => {
    if (!id) return

    const controller = new AbortController()

    Promise.resolve().then(() => loadEmployee(controller.signal))

    return () => controller.abort()
  }, [id, loadEmployee])

  useEffect(() => {
    const controller = new AbortController()

    async function loadDepartments() {
      try {
        const response = await fetch("/api/departments", {
          signal: controller.signal,
        })

        if (!response.ok) return

        const payload = await response.json()
        setDepartments(payload.data ?? [])
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
      }
    }

    loadDepartments()

    return () => controller.abort()
  }, [])

  const summary = useMemo(() => [
    { label: "Contracts", value: employee?.contracts?.length ?? 0, icon: FileText },
    { label: "Attendance", value: employee?.attendance?.length ?? 0, icon: Clock3 },
    { label: "Time Off", value: employee?.timeOff?.length ?? 0, icon: CalendarDays },
    { label: "Allocations", value: employee?.allocations?.length ?? 0, icon: Wallet },
    { label: "Payslips", value: employee?.payslips?.length ?? 0, icon: WalletCards },
  ], [employee])

  if (isLoading) {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <h1 className="text-xl font-semibold text-black">Loading employee profile...</h1>
        <p className="text-sm text-zinc-500">Fetching employee data from backend.</p>
      </main>
    )
  }

  if (!employee) {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <h1 className="text-xl font-semibold text-black">Employee not found</h1>
        <p className="text-sm text-zinc-500">{loadError || "This employee record is not available."}</p>
        <Button variant="outline" onClick={() => router.push("/employees")}><ArrowLeft className="h-4 w-4" /> Back to Employees</Button>
      </main>
    )
  }

  const employeeName = employee.fullName ?? `${employee.firstName} ${employee.lastName}`

  const openRelated = (path, view) => router.push(`${path}?employeeId=${employee.id}${view ? `&view=${view}` : ""}`)

  const startEditing = () => {
    setSaveError("")
    setEditForm({
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      workEmail: employee.workEmail,
      departmentId: employee.departmentId,
      jobTitle: employee.jobTitle,
      hireDate: employee.hireDate,
      status: employee.status,
    })
    setIsEditing(true)
  }

  const saveEmployee = async (event) => {
    event.preventDefault()
    setSaveError("")
    setIsSaving(true)
    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? "Unable to save employee")
      }

      await loadEmployee()
      setIsEditing(false)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save employee")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-zinc-300 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-black text-lg font-semibold text-white">{initials(employeeName)}</div><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold tracking-tight text-black">{employeeName}</h1><Badge variant={statusVariant(employee.status)}>{formatStatus(employee.status)}</Badge></div><p className="mt-1 text-sm text-zinc-600">{employee.jobTitle} - {employee.department}</p><p className="mt-2 text-xs font-mono text-zinc-500">{employee.employeeCode}</p></div></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => router.push("/employees")}><ArrowLeft className="h-4 w-4" /> Back to Employees</Button><Button onClick={startEditing}><Pencil className="h-4 w-4" /> Edit Employee</Button></div>
      </header>

      {isEditing && editForm && (
        <Card className="border-zinc-300 bg-white shadow-sm">
          <CardHeader className="border-b border-zinc-200 p-5">
            <h2 className="font-semibold text-black">Edit Employee</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Update core employee details used across HR and payroll.
            </p>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={saveEmployee} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["employeeCode", "Employee ID", "text"],
                ["firstName", "First name", "text"],
                ["lastName", "Last name", "text"],
                ["workEmail", "Work email", "email"],
                ["jobTitle", "Job position", "text"],
                ["hireDate", "Joining date", "date"],
              ].map(([name, label, type]) => (
                <label key={name} className="space-y-1.5 text-xs font-semibold text-zinc-600">
                  {label}
                  <Input
                    required
                    value={editForm[name] ?? ""}
                    type={type}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        [name]: event.target.value,
                      }))
                    }
                  />
                </label>
              ))}

              <label className="space-y-1.5 text-xs font-semibold text-zinc-600">
                Department
                <Select
                  required
                  value={editForm.departmentId ?? ""}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      departmentId: event.target.value,
                    }))
                  }
                >
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="space-y-1.5 text-xs font-semibold text-zinc-600">
                Status
                <Select
                  value={editForm.status}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="terminated">Terminated</option>
                </Select>
              </label>

              {saveError && (
                <p className="rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium text-black sm:col-span-2 lg:col-span-3">
                  {saveError}
                </p>
              )}

              <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
                <Button type="submit" disabled={isSaving}>
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="border-zinc-300 bg-white shadow-sm"><CardHeader className="border-b border-zinc-200 p-5"><h2 className="font-semibold text-black">Personal Information</h2></CardHeader><CardContent className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3"><div className="flex gap-3"><UserRound className="mt-0.5 h-4 w-4 text-zinc-400" /><div><p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Employee ID</p><p className="mt-1 text-sm font-medium text-black">{employee.employeeCode}</p></div></div><div className="flex gap-3"><Mail className="mt-0.5 h-4 w-4 text-zinc-400" /><div><p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Email</p><a className="mt-1 block text-sm font-medium text-black hover:underline" href={`mailto:${employee.workEmail}`}>{employee.workEmail}</a></div></div><div className="flex gap-3"><Phone className="mt-0.5 h-4 w-4 text-zinc-400" /><div><p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Phone</p><p className="mt-1 text-sm font-medium text-black">Not available</p></div></div><div><p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Department</p><p className="mt-1 text-sm font-medium text-black">{employee.department}</p></div><div><p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Manager</p><p className="mt-1 text-sm font-medium text-black">Not assigned</p></div><div><p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Joining Date</p><p className="mt-1 text-sm font-medium text-black">{formatDate(employee.hireDate)}</p></div></CardContent></Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{summary.slice(0, 4).map(({ label, value, icon: Icon }) => <button type="button" key={label} onClick={() => openRelated(label === "Contracts" ? "/contracts" : label === "Attendance" ? "/attendance" : "/timeoff", label === "Allocations" ? "allocations" : "requests")} className="text-left"><Card className="h-full border-zinc-300 bg-white shadow-sm transition hover:border-zinc-500"><CardContent className="flex items-center justify-between p-5"><div><p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p><p className="mt-2 text-2xl font-semibold text-black">{value}</p></div><Icon className="h-5 w-5 text-zinc-400" /></CardContent></Card></button>)}</section>

      <section className="space-y-4"><div className="flex gap-1 overflow-x-auto border-b border-zinc-300">{tabs.map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-xs font-semibold transition ${activeTab === tab ? "border-black text-black" : "border-transparent text-zinc-500 hover:text-black"}`}>{tab}</button>)}</div>{activeTab === "Overview" && <OverviewTab employee={employee} />}{activeTab === "Contracts" && <ContractsTab contracts={employee.contracts} />}{activeTab === "Attendance" && <AttendanceTab attendance={employee.attendance} />}{activeTab === "Time Off" && <TimeOffTab timeOff={employee.timeOff} />}{activeTab === "Allocations" && <AllocationsTab allocations={employee.allocations} />}{activeTab === "Payslips" && <PayslipsTab payslips={employee.payslips} />}</section>
    </main>
  )
}
