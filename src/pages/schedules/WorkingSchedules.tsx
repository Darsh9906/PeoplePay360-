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
import { Plus, Clock, XCircle, Trash2, Edit2, Eye, Calendar } from "lucide-react"

export interface Schedule {
  id: string
  name: string
  workingDays: string[]
  startTime: string
  endTime: string
  breakDurationMinutes: number
  totalWorkingHours: number
  status: "Active" | "Inactive"
}

const ALL_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]

function calculateWorkingHours(startTime: string, endTime: string, breakMinutes: number): number {
  if (!startTime || !endTime) return 0
  const [startH, startM] = startTime.split(":").map(Number)
  const [endH, endM] = endTime.split(":").map(Number)
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return 0

  const startTotalMinutes = startH * 60 + startM
  const endTotalMinutes = endH * 60 + endM

  if (endTotalMinutes <= startTotalMinutes) return 0

  const grossMinutes = endTotalMinutes - startTotalMinutes
  const netMinutes = Math.max(0, grossMinutes - (breakMinutes || 0))
  return parseFloat((netMinutes / 60).toFixed(2))
}

export default function WorkingSchedules() {
  // Starts with NO dummy/fake records
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [viewingSchedule, setViewingSchedule] = useState<Schedule | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as string[],
    startTime: "09:00",
    endTime: "17:00",
    breakDurationMinutes: 60,
    status: "Active" as "Active" | "Inactive",
  })

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Automatically computed total working hours for current form values
  const calculatedHours = useMemo(() => {
    return calculateWorkingHours(
      formData.startTime,
      formData.endTime,
      Number(formData.breakDurationMinutes) || 0
    )
  }, [formData.startTime, formData.endTime, formData.breakDurationMinutes])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const toggleDay = (day: string) => {
    setFormData((prev) => {
      const exists = prev.workingDays.includes(day)
      const updated = exists
        ? prev.workingDays.filter((d) => d !== day)
        : [...prev.workingDays, day]
      return { ...prev, workingDays: updated }
    })
    if (errors.workingDays) {
      setErrors((prev) => ({ ...prev, workingDays: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) {
      newErrors.name = "Schedule name is required"
    }
    if (formData.workingDays.length === 0) {
      newErrors.workingDays = "Select at least one working day"
    }
    if (!formData.startTime) {
      newErrors.startTime = "Start time is required"
    }
    if (!formData.endTime) {
      newErrors.endTime = "End time is required"
    }
    if (formData.startTime && formData.endTime) {
      const [sh, sm] = formData.startTime.split(":").map(Number)
      const [eh, em] = formData.endTime.split(":").map(Number)
      if (eh * 60 + em <= sh * 60 + sm) {
        newErrors.endTime = "End time must be later than start time"
      }
    }
    if (Number(formData.breakDurationMinutes) < 0) {
      newErrors.breakDurationMinutes = "Break duration cannot be negative"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    const totalHours = calculateWorkingHours(
      formData.startTime,
      formData.endTime,
      Number(formData.breakDurationMinutes) || 0
    )

    if (editingSchedule) {
      // Update
      setSchedules((prev) =>
        prev.map((s) =>
          s.id === editingSchedule.id
            ? {
                ...s,
                name: formData.name.trim(),
                workingDays: formData.workingDays,
                startTime: formData.startTime,
                endTime: formData.endTime,
                breakDurationMinutes: Number(formData.breakDurationMinutes) || 0,
                totalWorkingHours: totalHours,
                status: formData.status,
              }
            : s
        )
      )
    } else {
      // Add new
      const newSchedule: Schedule = {
        id: `SCH-${String(schedules.length + 1).padStart(3, "0")}`,
        name: formData.name.trim(),
        workingDays: formData.workingDays,
        startTime: formData.startTime,
        endTime: formData.endTime,
        breakDurationMinutes: Number(formData.breakDurationMinutes) || 0,
        totalWorkingHours: totalHours,
        status: formData.status,
      }
      setSchedules((prev) => [newSchedule, ...prev])
    }

    setIsModalOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      name: "",
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      startTime: "09:00",
      endTime: "17:00",
      breakDurationMinutes: 60,
      status: "Active",
    })
    setEditingSchedule(null)
    setErrors({})
  }

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule)
    setFormData({
      name: schedule.name,
      workingDays: schedule.workingDays,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      breakDurationMinutes: schedule.breakDurationMinutes,
      status: schedule.status,
    })
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this working schedule?")) {
      setSchedules((prev) => prev.filter((s) => s.id !== id))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Working Schedules
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Manage daily working shifts, operational hours, and break durations.
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
          Add Working Schedule
        </Button>
      </div>

      {/* Schedules Table */}
      <div className="rounded-xl border border-zinc-300 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 bg-zinc-50">
              <TableHead className="text-black font-semibold">Schedule Name</TableHead>
              <TableHead className="text-black font-semibold">Working Days</TableHead>
              <TableHead className="text-black font-semibold">Start Time</TableHead>
              <TableHead className="text-black font-semibold">End Time</TableHead>
              <TableHead className="text-black font-semibold">Break Duration</TableHead>
              <TableHead className="text-black font-semibold">Total Hours</TableHead>
              <TableHead className="text-black font-semibold">Status</TableHead>
              <TableHead className="text-black font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.length > 0 ? (
              schedules.map((sch) => (
                <TableRow key={sch.id} className="border-zinc-200 hover:bg-zinc-50">
                  <TableCell className="font-semibold text-black">
                    <div>
                      {sch.name}
                      <div className="text-xs text-zinc-500 font-mono font-normal">
                        {sch.id}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {sch.workingDays.map((day) => (
                        <span
                          key={day}
                          className="inline-block rounded bg-zinc-100 border border-zinc-300 px-1.5 py-0.5 text-[11px] font-medium text-black"
                        >
                          {day.slice(0, 3)}
                        </span>
                      ))}
                    </div>
                  </TableCell>

                  <TableCell className="text-xs font-mono text-zinc-800">
                    {sch.startTime}
                  </TableCell>

                  <TableCell className="text-xs font-mono text-zinc-800">
                    {sch.endTime}
                  </TableCell>

                  <TableCell className="text-xs text-zinc-700">
                    {sch.breakDurationMinutes} mins
                  </TableCell>

                  <TableCell className="text-xs font-semibold text-black">
                    {sch.totalWorkingHours} hrs
                  </TableCell>

                  <TableCell>
                    <Badge variant={sch.status === "Active" ? "active" : "inactive"}>
                      {sch.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingSchedule(sch)}
                        className="h-8 w-8 p-0 text-zinc-600 hover:text-black"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(sch)}
                        className="h-8 w-8 p-0 text-zinc-600 hover:text-black"
                        title="Edit schedule"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(sch.id)}
                        className="h-8 w-8 p-0 text-zinc-600 hover:text-black"
                        title="Delete schedule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-56 text-center">
                  <div className="flex flex-col items-center justify-center text-zinc-500 space-y-2 py-6">
                    <XCircle className="h-10 w-10 text-zinc-300" />
                    <p className="text-base font-bold text-black">
                      No working schedules found
                    </p>
                    <p className="text-xs text-zinc-500 max-w-sm">
                      There are no working schedules created yet. Click "Add Working Schedule" to create a shift pattern.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Schedule Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogHeader>
          <DialogTitle className="text-black font-bold">
            {editingSchedule ? "Edit Working Schedule" : "Add Working Schedule"}
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            Define daily shift hours, break durations, and working days.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSaveSchedule} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-black">
              Schedule Name <span className="text-black">*</span>
            </label>
            <Input
              name="name"
              placeholder="e.g. Standard 5-Day Shift"
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
              Working Days <span className="text-black">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {ALL_DAYS.map((day) => {
                const isSelected = formData.workingDays.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      isSelected
                        ? "bg-black text-white border-black"
                        : "bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100"
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
            {errors.workingDays && (
              <p className="text-[11px] font-medium text-black">{errors.workingDays}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">
                Start Time <span className="text-black">*</span>
              </label>
              <Input
                name="startTime"
                type="time"
                value={formData.startTime}
                onChange={handleInputChange}
                className={errors.startTime ? "border-black font-medium" : "border-zinc-300"}
              />
              {errors.startTime && (
                <p className="text-[11px] font-medium text-black">{errors.startTime}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">
                End Time <span className="text-black">*</span>
              </label>
              <Input
                name="endTime"
                type="time"
                value={formData.endTime}
                onChange={handleInputChange}
                className={errors.endTime ? "border-black font-medium" : "border-zinc-300"}
              />
              {errors.endTime && (
                <p className="text-[11px] font-medium text-black">{errors.endTime}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">
                Break Duration (Minutes)
              </label>
              <Input
                name="breakDurationMinutes"
                type="number"
                min="0"
                placeholder="60"
                value={formData.breakDurationMinutes}
                onChange={handleInputChange}
                className={errors.breakDurationMinutes ? "border-black font-medium" : "border-zinc-300"}
              />
              {errors.breakDurationMinutes && (
                <p className="text-[11px] font-medium text-black">{errors.breakDurationMinutes}</p>
              )}
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

          {/* Automatic Calculation Display */}
          <div className="p-3 bg-zinc-100 rounded-md border border-zinc-300 flex items-center justify-between text-xs">
            <span className="font-medium text-zinc-700">Calculated Total Working Hours:</span>
            <span className="font-bold text-black text-sm">
              {calculatedHours} hrs / day
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
              {editingSchedule ? "Update Schedule" : "Save Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* View Schedule Modal */}
      {viewingSchedule && (
        <Dialog open={Boolean(viewingSchedule)} onOpenChange={() => setViewingSchedule(null)}>
          <DialogHeader>
            <DialogTitle className="text-black font-bold">
              {viewingSchedule.name}
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              Working Schedule Details ({viewingSchedule.id})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="flex justify-between py-1 border-b border-zinc-200">
              <span className="text-zinc-500 font-medium">Status:</span>
              <Badge variant={viewingSchedule.status === "Active" ? "active" : "inactive"}>
                {viewingSchedule.status}
              </Badge>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-200">
              <span className="text-zinc-500 font-medium">Shift Hours:</span>
              <span className="font-mono text-black">
                {viewingSchedule.startTime} – {viewingSchedule.endTime}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-200">
              <span className="text-zinc-500 font-medium">Break Duration:</span>
              <span className="text-black">{viewingSchedule.breakDurationMinutes} minutes</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-200">
              <span className="text-zinc-500 font-medium">Net Daily Working Hours:</span>
              <span className="font-bold text-black">{viewingSchedule.totalWorkingHours} hrs</span>
            </div>
            <div className="pt-2">
              <span className="text-zinc-500 font-medium block mb-1.5">Working Days:</span>
              <div className="flex flex-wrap gap-1">
                {viewingSchedule.workingDays.map((d) => (
                  <span
                    key={d}
                    className="px-2 py-0.5 rounded bg-black text-white text-[11px] font-medium"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setViewingSchedule(null)}
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
