"use client"

import { useState, useMemo } from "react"
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
import { Plus, Search, Filter, XCircle, Trash2, Edit2, Eye, Calendar, User } from "lucide-react"

export interface AttendanceRecord {
  id: string
  employeeId: string
  employeeName: string
  date: string
  checkIn: string
  checkOut: string
  workingHours: number
  status: "Present" | "Absent" | "Late" | "Half Day"
}

function calculateAttendanceHours(checkIn: string, checkOut: string, status: string): number {
  if (status === "Absent") return 0
  if (!checkIn || !checkOut) return 0

  const [inH, inM] = checkIn.split(":").map(Number)
  const [outH, outM] = checkOut.split(":").map(Number)
  if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return 0

  const startMin = inH * 60 + inM
  const endMin = outH * 60 + outM

  if (endMin <= startMin) return 0
  return parseFloat(((endMin - startMin) / 60).toFixed(2))
}

export default function Attendance() {
  // Starts with NO dummy/fake records
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDate, setFilterDate] = useState("")
  const [filterStatus, setFilterStatus] = useState("ALL")

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null)
  const [viewingRecord, setViewingRecord] = useState<AttendanceRecord | null>(null)

  // Available employees (starts empty, user can enter employee name or select if available)
  const [formData, setFormData] = useState({
    employeeName: "",
    date: new Date().toISOString().split("T")[0],
    checkIn: "09:00",
    checkOut: "17:00",
    status: "Present" as "Present" | "Absent" | "Late" | "Half Day",
  })

  // Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Combined Search and Filters
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      const searchLower = searchQuery.toLowerCase().trim()
      const matchesEmployee =
        !searchLower || rec.employeeName.toLowerCase().includes(searchLower)

      const matchesDate = !filterDate || rec.date === filterDate

      const matchesStatus = filterStatus === "ALL" || rec.status === filterStatus

      return matchesEmployee && matchesDate && matchesStatus
    })
  }, [records, searchQuery, filterDate, filterStatus])

  // Automatically computed working hours for form
  const calculatedHours = useMemo(() => {
    return calculateAttendanceHours(formData.checkIn, formData.checkOut, formData.status)
  }, [formData.checkIn, formData.checkOut, formData.status])

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
    if (!formData.employeeName.trim()) {
      newErrors.employeeName = "Employee name is required"
    }
    if (!formData.date) {
      newErrors.date = "Date is required"
    }
    if (!formData.status) {
      newErrors.status = "Status is required"
    }

    if (formData.status !== "Absent") {
      if (!formData.checkIn) {
        newErrors.checkIn = "Check In time is required"
      }
      if (formData.checkIn && formData.checkOut) {
        const [inH, inM] = formData.checkIn.split(":").map(Number)
        const [outH, outM] = formData.checkOut.split(":").map(Number)
        if (outH * 60 + outM <= inH * 60 + inM) {
          newErrors.checkOut = "Check Out cannot be earlier than or equal to Check In"
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSaveAttendance = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    const hours = calculateAttendanceHours(formData.checkIn, formData.checkOut, formData.status)

    if (editingRecord) {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === editingRecord.id
            ? {
                ...r,
                employeeName: formData.employeeName.trim(),
                date: formData.date,
                checkIn: formData.status === "Absent" ? "-" : formData.checkIn,
                checkOut: formData.status === "Absent" ? "-" : formData.checkOut,
                workingHours: hours,
                status: formData.status,
              }
            : r
        )
      )
    } else {
      const newRec: AttendanceRecord = {
        id: `ATT-${String(records.length + 1).padStart(3, "0")}`,
        employeeId: `EMP-${String(records.length + 1).padStart(3, "0")}`,
        employeeName: formData.employeeName.trim(),
        date: formData.date,
        checkIn: formData.status === "Absent" ? "-" : formData.checkIn,
        checkOut: formData.status === "Absent" ? "-" : formData.checkOut,
        workingHours: hours,
        status: formData.status,
      }
      setRecords((prev) => [newRec, ...prev])
    }

    setIsModalOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      employeeName: "",
      date: new Date().toISOString().split("T")[0],
      checkIn: "09:00",
      checkOut: "17:00",
      status: "Present",
    })
    setEditingRecord(null)
    setErrors({})
  }

  const handleEdit = (record: AttendanceRecord) => {
    setEditingRecord(record)
    setFormData({
      employeeName: record.employeeName,
      date: record.date,
      checkIn: record.checkIn === "-" ? "09:00" : record.checkIn,
      checkOut: record.checkOut === "-" ? "17:00" : record.checkOut,
      status: record.status,
    })
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this attendance record?")) {
      setRecords((prev) => prev.filter((r) => r.id !== id))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Attendance
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Track daily attendance entries, check-in &amp; check-out timestamps, and working hours.
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setIsModalOpen(true)
          }}
          className="bg-black hover:bg-zinc-800 text-white shadow-sm font-medium gap-1.5 self-start sm:self-auto border border-black"
        >
          <Plus className="h-4 w-4" />
          Add Attendance
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white p-4 rounded-xl border border-zinc-300 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            type="text"
            placeholder="Filter by employee name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-zinc-300 focus-visible:ring-black"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-zinc-500 hidden sm:block" />
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-40 bg-white border-zinc-300 text-black text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-500 hidden sm:block" />
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-36 bg-white border-zinc-300 text-black"
            >
              <option value="ALL">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
              <option value="Half Day">Half Day</option>
            </Select>
          </div>

          {(searchQuery || filterDate || filterStatus !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("")
                setFilterDate("")
                setFilterStatus("ALL")
              }}
              className="text-xs text-zinc-600 hover:text-black"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Attendance Table */}
      <div className="rounded-xl border border-zinc-300 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 bg-zinc-50">
              <TableHead className="text-black font-semibold">Employee</TableHead>
              <TableHead className="text-black font-semibold">Date</TableHead>
              <TableHead className="text-black font-semibold">Check In</TableHead>
              <TableHead className="text-black font-semibold">Check Out</TableHead>
              <TableHead className="text-black font-semibold">Working Hours</TableHead>
              <TableHead className="text-black font-semibold">Status</TableHead>
              <TableHead className="text-black font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.length > 0 ? (
              filteredRecords.map((rec) => {
                const badgeVariant =
                  rec.status === "Present"
                    ? "active"
                    : rec.status === "Late"
                    ? "expiring"
                    : rec.status === "Half Day"
                    ? "draft"
                    : "inactive"

                return (
                  <TableRow key={rec.id} className="border-zinc-200 hover:bg-zinc-50">
                    <TableCell className="font-semibold text-black">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 border border-zinc-300 text-black text-xs font-bold">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <div>{rec.employeeName}</div>
                          <div className="text-xs text-zinc-500 font-mono font-normal">
                            {rec.id}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs font-mono text-zinc-800">
                      {rec.date}
                    </TableCell>

                    <TableCell className="text-xs font-mono text-zinc-800">
                      {rec.checkIn}
                    </TableCell>

                    <TableCell className="text-xs font-mono text-zinc-800">
                      {rec.checkOut}
                    </TableCell>

                    <TableCell className="text-xs font-semibold text-black">
                      {rec.workingHours} hrs
                    </TableCell>

                    <TableCell>
                      <Badge variant={badgeVariant}>{rec.status}</Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingRecord(rec)}
                          className="h-8 w-8 p-0 text-zinc-600 hover:text-black"
                          title="View record"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(rec)}
                          className="h-8 w-8 p-0 text-zinc-600 hover:text-black"
                          title="Edit record"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(rec.id)}
                          className="h-8 w-8 p-0 text-zinc-600 hover:text-black"
                          title="Delete record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
                      No attendance records found
                    </p>
                    <p className="text-xs text-zinc-500 max-w-sm">
                      There are no attendance records logged yet. Click &quot;Add Attendance&quot; to log check-in/out entries.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Attendance Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogHeader>
          <DialogTitle className="text-black font-bold">
            {editingRecord ? "Edit Attendance Record" : "Add Attendance Record"}
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            Record employee daily attendance and check-in/out hours.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSaveAttendance} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-black">
              Employee Name <span className="text-black">*</span>
            </label>
            <Input
              name="employeeName"
              placeholder="e.g. Aarav Patel"
              value={formData.employeeName}
              onChange={handleInputChange}
              className={errors.employeeName ? "border-black font-medium" : "border-zinc-300"}
            />
            {errors.employeeName && (
              <p className="text-[11px] font-medium text-black">{errors.employeeName}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">
                Date <span className="text-black">*</span>
              </label>
              <Input
                name="date"
                type="date"
                value={formData.date}
                onChange={handleInputChange}
                className={errors.date ? "border-black font-medium" : "border-zinc-300"}
              />
              {errors.date && (
                <p className="text-[11px] font-medium text-black">{errors.date}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">
                Status <span className="text-black">*</span>
              </label>
              <Select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="border-zinc-300 text-black"
              >
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Late">Late</option>
                <option value="Half Day">Half Day</option>
              </Select>
            </div>
          </div>

          {formData.status !== "Absent" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-black">
                  Check In Time <span className="text-black">*</span>
                </label>
                <Input
                  name="checkIn"
                  type="time"
                  value={formData.checkIn}
                  onChange={handleInputChange}
                  className={errors.checkIn ? "border-black font-medium" : "border-zinc-300"}
                />
                {errors.checkIn && (
                  <p className="text-[11px] font-medium text-black">{errors.checkIn}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-black">
                  Check Out Time
                </label>
                <Input
                  name="checkOut"
                  type="time"
                  value={formData.checkOut}
                  onChange={handleInputChange}
                  className={errors.checkOut ? "border-black font-medium" : "border-zinc-300"}
                />
                {errors.checkOut && (
                  <p className="text-[11px] font-medium text-black">{errors.checkOut}</p>
                )}
              </div>
            </div>
          )}

          {/* Automatic Calculation Display */}
          <div className="p-3 bg-zinc-100 rounded-md border border-zinc-300 flex items-center justify-between text-xs">
            <span className="font-medium text-zinc-700">Calculated Working Hours:</span>
            <span className="font-bold text-black text-sm">
              {calculatedHours} hrs
            </span>
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
              {editingRecord ? "Update Attendance" : "Save Attendance"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* View Attendance Modal */}
      {viewingRecord && (
        <Dialog open={Boolean(viewingRecord)} onOpenChange={() => setViewingRecord(null)}>
          <DialogHeader>
            <DialogTitle className="text-black font-bold">
              Attendance Record ({viewingRecord.id})
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              Detailed entry for {viewingRecord.employeeName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="flex justify-between py-1 border-b border-zinc-200">
              <span className="text-zinc-500 font-medium">Employee Name:</span>
              <span className="font-bold text-black">{viewingRecord.employeeName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-200">
              <span className="text-zinc-500 font-medium">Date:</span>
              <span className="font-mono text-black">{viewingRecord.date}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-200">
              <span className="text-zinc-500 font-medium">Status:</span>
              <Badge variant={viewingRecord.status === "Present" ? "active" : "inactive"}>
                {viewingRecord.status}
              </Badge>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-200">
              <span className="text-zinc-500 font-medium">Check In:</span>
              <span className="font-mono text-black">{viewingRecord.checkIn}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-200">
              <span className="text-zinc-500 font-medium">Check Out:</span>
              <span className="font-mono text-black">{viewingRecord.checkOut}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-200">
              <span className="text-zinc-500 font-medium">Net Working Hours:</span>
              <span className="font-bold text-black">{viewingRecord.workingHours} hrs</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setViewingRecord(null)}
              className="bg-black hover:bg-zinc-800 text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  )
}
