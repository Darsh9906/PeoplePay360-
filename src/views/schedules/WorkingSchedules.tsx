"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CalendarClock, Edit2, Eye, Plus, Trash2, UserPlus, Users, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { apiRequest } from "@/src/lib/api"
import { dayNames, lineHours, weeklyHoursFromLines } from "@/lib/schedule/hours"

type ScheduleLine = {
  id?: string
  dayOfWeek: number
  startTime: string
  endTime: string
  breakMinutes: number
}

type BackendSchedule = {
  id: string
  name: string
  workingDays: string[]
  startTime: string
  endTime: string
  breakDurationMinutes: number
  weeklyHours: string
  timezone: string
  status: "active" | "inactive"
  lines: ScheduleLine[]
}

type EmployeeAssignment = {
  id: string
  employeeId: string
  scheduleId: string
  effectiveFrom: string
  effectiveTo?: string | null
}

type EmployeeOption = {
  id: string
  employeeCode: string
  fullName?: string
  firstName?: string
  lastName?: string
}

/** Editor row per weekday — `enabled` decides whether it becomes a line. */
type DayRow = {
  dayOfWeek: number
  enabled: boolean
  startTime: string
  endTime: string
  breakMinutes: number
}

// Monday-first, which is how a working week reads.
const dayOrder = [1, 2, 3, 4, 5, 6, 0]

function defaultRows(): DayRow[] {
  return dayOrder.map((dayOfWeek) => ({
    dayOfWeek,
    enabled: dayOfWeek >= 1 && dayOfWeek <= 5,
    startTime: "09:00",
    endTime: "18:00",
    breakMinutes: 60,
  }))
}

function rowsFromSchedule(schedule: BackendSchedule): DayRow[] {
  return dayOrder.map((dayOfWeek) => {
    const line = schedule.lines?.find((item) => item.dayOfWeek === dayOfWeek)

    return {
      dayOfWeek,
      enabled: Boolean(line),
      startTime: line?.startTime ?? schedule.startTime ?? "09:00",
      endTime: line?.endTime ?? schedule.endTime ?? "18:00",
      breakMinutes: line?.breakMinutes ?? schedule.breakDurationMinutes ?? 0,
    }
  })
}

function scheduleTypeLabel(daysCount: number, weeklyHours: number) {
  if (daysCount === 0) return "Unset"
  if (weeklyHours >= 38) return "Full time"
  if (weeklyHours >= 20) return "Part time"
  return "Flexible"
}

export default function WorkingSchedules() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<BackendSchedule | null>(null)
  const [viewing, setViewing] = useState<BackendSchedule | null>(null)
  const [managingSchedule, setManagingSchedule] = useState<BackendSchedule | null>(null)
  const [name, setName] = useState("")
  const [status, setStatus] = useState<"active" | "inactive">("active")
  const [rows, setRows] = useState<DayRow[]>(defaultRows())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState("")
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("")
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().split("T")[0])
  const [assignError, setAssignError] = useState("")

  const schedulesQuery = useQuery({
    queryKey: ["schedules"],
    queryFn: () => apiRequest<BackendSchedule[]>("/api/schedules"),
  })

  const employeeSchedulesQuery = useQuery({
    queryKey: ["employee-schedules"],
    queryFn: () => apiRequest<EmployeeAssignment[]>("/api/employee-schedules"),
  })

  const employeesQuery = useQuery({
    queryKey: ["employees"],
    queryFn: () => apiRequest<EmployeeOption[]>("/api/employees"),
  })

  const schedules = useMemo(() => schedulesQuery.data ?? [], [schedulesQuery.data])
  const employeeSchedules = useMemo(() => employeeSchedulesQuery.data ?? [], [employeeSchedulesQuery.data])
  const employees = useMemo(() => employeesQuery.data ?? [], [employeesQuery.data])

  const assignedCountMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const assignment of employeeSchedules) {
      map[assignment.scheduleId] = (map[assignment.scheduleId] || 0) + 1
    }
    return map
  }, [employeeSchedules])

  // Weekly hours are always derived from the pattern, never typed in.
  const enabledLines = useMemo(
    () =>
      rows
        .filter((row) => row.enabled)
        .map((row) => ({
          dayOfWeek: row.dayOfWeek,
          startTime: row.startTime,
          endTime: row.endTime,
          breakMinutes: Number(row.breakMinutes) || 0,
        })),
    [rows],
  )
  const weeklyHours = useMemo(
    () => weeklyHoursFromLines(enabledLines),
    [enabledLines],
  )

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { name: name.trim(), status, lines: enabledLines }

      return editing
        ? apiRequest(`/api/schedules/${editing.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : apiRequest("/api/schedules", {
            method: "POST",
            body: JSON.stringify(payload),
          })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] })
      setIsModalOpen(false)
      setSaveError("")
    },
    onError: (error: Error) => setSaveError(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/schedules/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] })
      queryClient.invalidateQueries({ queryKey: ["employee-schedules"] })
    },
    onError: (error: Error) => setSaveError(error.message),
  })

  const assignEmployeeMutation = useMutation({
    mutationFn: (payload: { employeeId: string; scheduleId: string; effectiveFrom: string }) =>
      apiRequest("/api/employee-schedules", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-schedules"] })
      setSelectedEmployeeId("")
      setAssignError("")
    },
    onError: (error: Error) => setAssignError(error.message),
  })

  const removeEmployeeMutation = useMutation({
    mutationFn: ({ employeeId, scheduleId }: { employeeId: string; scheduleId: string }) =>
      apiRequest(`/api/employee-schedules?employeeId=${employeeId}&scheduleId=${scheduleId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-schedules"] })
      setAssignError("")
    },
    onError: (error: Error) => setAssignError(error.message),
  })

  function openCreate() {
    setEditing(null)
    setName("")
    setStatus("active")
    setRows(defaultRows())
    setErrors({})
    setSaveError("")
    setIsModalOpen(true)
  }

  function openEdit(schedule: BackendSchedule) {
    setEditing(schedule)
    setName(schedule.name)
    setStatus(schedule.status)
    setRows(rowsFromSchedule(schedule))
    setErrors({})
    setSaveError("")
    setIsModalOpen(true)
  }

  function openManageEmployees(schedule: BackendSchedule) {
    setManagingSchedule(schedule)
    setSelectedEmployeeId("")
    setEffectiveFrom(new Date().toISOString().split("T")[0])
    setAssignError("")
  }

  function updateRow(dayOfWeek: number, patch: Partial<DayRow>) {
    setRows((current) =>
      current.map((row) =>
        row.dayOfWeek === dayOfWeek ? { ...row, ...patch } : row,
      ),
    )
    setErrors((current) => ({ ...current, lines: "" }))
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaveError("")
    const nextErrors: Record<string, string> = {}

    if (!name.trim()) nextErrors.name = "Schedule name is required"
    if (enabledLines.length === 0) {
      nextErrors.lines = "Enable at least one working day"
    }
    if (enabledLines.some((line) => lineHours(line) <= 0)) {
      nextErrors.lines =
        "Each working day needs an end time later than its start, after the break"
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    saveMutation.mutate()
  }

  function handleAssignEmployee(event: React.FormEvent) {
    event.preventDefault()
    if (!selectedEmployeeId || !managingSchedule) {
      setAssignError("Please select an employee")
      return
    }
    if (!effectiveFrom) {
      setAssignError("Effective from date is required")
      return
    }

    assignEmployeeMutation.mutate({
      employeeId: selectedEmployeeId,
      scheduleId: managingSchedule.id,
      effectiveFrom,
    })
  }

  // Current assignments for managingSchedule
  const currentScheduleAssignments = useMemo(() => {
    if (!managingSchedule) return []
    return employeeSchedules.filter(
      (assignment) => assignment.scheduleId === managingSchedule.id,
    )
  }, [managingSchedule, employeeSchedules])

  // Filter employees available to assign (not already assigned to this schedule)
  const availableEmployeesToAssign = useMemo(() => {
    if (!managingSchedule) return []
    const assignedIds = new Set(
      currentScheduleAssignments.map((assignment) => assignment.employeeId),
    )
    return employees.filter((emp) => !assignedIds.has(emp.id))
  }, [managingSchedule, currentScheduleAssignments, employees])

  const getEmployeeName = (emp?: EmployeeOption) => {
    if (!emp) return "Unknown Employee"
    if (emp.fullName) return emp.fullName
    const combined = `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim()
    return combined || emp.employeeCode || "Employee"
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Working Schedules
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Define the weekly pattern per day. Weekly hours are calculated
            automatically.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Schedule
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 bg-zinc-50">
              <TableHead className="font-semibold text-black">Name</TableHead>
              <TableHead className="font-semibold text-black">Type</TableHead>
              <TableHead className="font-semibold text-black">
                Working days
              </TableHead>
              <TableHead className="font-semibold text-black">
                Weekly hours
              </TableHead>
              <TableHead className="font-semibold text-black">
                Assigned Employees
              </TableHead>
              <TableHead className="font-semibold text-black">Status</TableHead>
              <TableHead className="text-right font-semibold text-black">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedulesQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-sm text-zinc-500">
                  Loading schedules...
                </TableCell>
              </TableRow>
            ) : schedules.length > 0 ? (
              schedules.map((schedule) => {
                const daysCount = schedule.lines?.length ?? 0
                const hours = Number(schedule.weeklyHours)
                const assignedCount = assignedCountMap[schedule.id] ?? 0

                return (
                  <TableRow
                    key={schedule.id}
                    className="border-zinc-200 hover:bg-zinc-50"
                  >
                    <TableCell className="font-semibold text-black">
                      {schedule.name}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-700">
                      {scheduleTypeLabel(daysCount, hours)}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-700">
                      {daysCount} day{daysCount === 1 ? "" : "s"}
                      <div className="text-[11px] text-zinc-500">
                        {schedule.workingDays
                          ?.map((day) => day.slice(0, 3))
                          .join(", ")}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-bold tabular-nums text-black">
                      {hours.toFixed(2)} hrs
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => openManageEmployees(schedule)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-black transition hover:bg-zinc-100"
                        title="Manage assigned employees"
                      >
                        <Users className="h-3.5 w-3.5 text-zinc-600" />
                        <span>{assignedCount} employee{assignedCount === 1 ? "" : "s"}</span>
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          schedule.status === "active" ? "active" : "inactive"
                        }
                      >
                        {schedule.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`View ${schedule.name}`}
                          title="View pattern details"
                          onClick={() => setViewing(schedule)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Manage employees for ${schedule.name}`}
                          title="Manage employees"
                          onClick={() => openManageEmployees(schedule)}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Edit ${schedule.name}`}
                          title="Edit schedule"
                          onClick={() => openEdit(schedule)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Delete ${schedule.name}`}
                          title="Delete schedule"
                          onClick={() => deleteMutation.mutate(schedule.id)}
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
                  <div className="flex flex-col items-center gap-2 py-6 text-zinc-500">
                    <XCircle className="h-10 w-10 text-zinc-300" />
                    <p className="text-base font-bold text-black">
                      No working schedules
                    </p>
                    <p className="max-w-sm text-xs">
                      Create a schedule to standardise attendance and payroll
                      expectations.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create / edit form with the weekly pattern */}
      <Dialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        className="max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Working Schedule" : "New Working Schedule"}
          </DialogTitle>
          <DialogDescription>
            Set the hours for each working day. Total weekly hours are derived
            from this pattern.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit}>
          {saveError && (
            <div className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-medium text-black">
              {saveError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">
                Schedule name
              </label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Standard 40 Hours"
              />
              {errors.name && (
                <p className="text-[11px] font-medium text-black">
                  {errors.name}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">Status</label>
              <Select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as "active" | "inactive")
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-black">
                Weekly pattern
              </label>
              <span className="text-[11px] text-zinc-500">
                Day · Start · End · Break
              </span>
            </div>

            <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-300">
              {rows.map((row) => {
                const hours = row.enabled
                  ? lineHours({
                      dayOfWeek: row.dayOfWeek,
                      startTime: row.startTime,
                      endTime: row.endTime,
                      breakMinutes: Number(row.breakMinutes) || 0,
                    })
                  : 0

                return (
                  <div
                    key={row.dayOfWeek}
                    className={`grid grid-cols-[112px_1fr_1fr_88px_60px] items-center gap-2 px-3 py-2 ${
                      row.enabled ? "bg-white" : "bg-zinc-50"
                    }`}
                  >
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-black"
                        checked={row.enabled}
                        onChange={(event) =>
                          updateRow(row.dayOfWeek, {
                            enabled: event.target.checked,
                          })
                        }
                      />
                      <span
                        className={`text-xs font-semibold ${
                          row.enabled ? "text-black" : "text-zinc-400"
                        }`}
                      >
                        {dayNames[row.dayOfWeek]}
                      </span>
                    </label>

                    <Input
                      type="time"
                      value={row.startTime}
                      disabled={!row.enabled}
                      onChange={(event) =>
                        updateRow(row.dayOfWeek, {
                          startTime: event.target.value,
                        })
                      }
                      className="h-8 text-xs"
                      aria-label={`${dayNames[row.dayOfWeek]} start time`}
                    />
                    <Input
                      type="time"
                      value={row.endTime}
                      disabled={!row.enabled}
                      onChange={(event) =>
                        updateRow(row.dayOfWeek, { endTime: event.target.value })
                      }
                      className="h-8 text-xs"
                      aria-label={`${dayNames[row.dayOfWeek]} end time`}
                    />
                    <Input
                      type="number"
                      min="0"
                      step="5"
                      value={row.breakMinutes}
                      disabled={!row.enabled}
                      onChange={(event) =>
                        updateRow(row.dayOfWeek, {
                          breakMinutes: Number(event.target.value),
                        })
                      }
                      className="h-8 text-xs"
                      aria-label={`${dayNames[row.dayOfWeek]} break minutes`}
                    />
                    <span
                      className={`text-right text-xs tabular-nums ${
                        row.enabled ? "font-semibold text-black" : "text-zinc-400"
                      }`}
                    >
                      {hours.toFixed(1)}h
                    </span>
                  </div>
                )
              })}
            </div>

            {errors.lines && (
              <p className="text-[11px] font-medium text-black">{errors.lines}</p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-black bg-black px-4 py-3 text-white">
            <span className="text-xs font-semibold uppercase tracking-wide">
              Total weekly hours
            </span>
            <span className="text-lg font-bold tabular-nums">
              {weeklyHours.toFixed(2)}
            </span>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {editing ? "Save Changes" : "Create Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Read-only detail */}
      <Dialog open={Boolean(viewing)} onOpenChange={() => setViewing(null)}>
        <DialogHeader>
          <DialogTitle>{viewing?.name}</DialogTitle>
          <DialogDescription>Weekly working pattern.</DialogDescription>
        </DialogHeader>
        {viewing && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs">
              <span className="text-zinc-600">Total weekly hours</span>
              <span className="font-bold text-black">
                {Number(viewing.weeklyHours).toFixed(2)} hrs
              </span>
            </div>
            {viewing.lines?.length ? (
              <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
                {[...viewing.lines]
                  .sort(
                    (a, b) =>
                      dayOrder.indexOf(a.dayOfWeek) -
                      dayOrder.indexOf(b.dayOfWeek),
                  )
                  .map((line) => (
                    <div
                      key={`${line.dayOfWeek}-${line.startTime}`}
                      className="flex items-center justify-between px-3 py-2 text-xs"
                    >
                      <span className="font-semibold text-black">
                        {dayNames[line.dayOfWeek]}
                      </span>
                      <span className="text-zinc-600">
                        {line.startTime} – {line.endTime}
                        {line.breakMinutes > 0 &&
                          ` · ${line.breakMinutes}m break`}
                      </span>
                      <span className="font-semibold tabular-nums text-black">
                        {lineHours(line).toFixed(1)}h
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-zinc-500">
                <CalendarClock className="h-8 w-8 text-zinc-300" />
                <p className="text-xs">No day lines configured.</p>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button onClick={() => setViewing(null)}>Close</Button>
        </DialogFooter>
      </Dialog>

      {/* Employee Schedule Assignment Dialog */}
      <Dialog
        open={Boolean(managingSchedule)}
        onOpenChange={(open) => {
          if (!open) setManagingSchedule(null)
        }}
        className="max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>
            Manage Employees for {managingSchedule?.name}
          </DialogTitle>
          <DialogDescription>
            Assign or remove real employee schedules.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {assignError && (
            <div className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-medium text-black">
              {assignError}
            </div>
          )}

          {/* Form to assign a new employee */}
          <form onSubmit={handleAssignEmployee} className="rounded-lg border border-zinc-300 bg-zinc-50 p-4 space-y-3">
            <h3 className="text-xs font-bold tracking-wide uppercase text-black">
              Assign Employee to Schedule
            </h3>
            <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-700">
                  Select Employee
                </label>
                <Select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  disabled={employeesQuery.isLoading || availableEmployeesToAssign.length === 0}
                >
                  <option value="">
                    {employeesQuery.isLoading
                      ? "Loading employees..."
                      : availableEmployeesToAssign.length === 0
                      ? "All employees already assigned"
                      : "-- Select an employee --"}
                  </option>
                  {availableEmployeesToAssign.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {getEmployeeName(emp)} ({emp.employeeCode})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-700">
                  Effective From
                </label>
                <Input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={
                  assignEmployeeMutation.isPending ||
                  !selectedEmployeeId ||
                  availableEmployeesToAssign.length === 0
                }
              >
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                Assign Employee
              </Button>
            </div>
          </form>

          {/* List of currently assigned employees */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold tracking-wide uppercase text-black">
              Currently Assigned ({currentScheduleAssignments.length})
            </h3>

            {employeeSchedulesQuery.isLoading ? (
              <p className="text-xs text-zinc-500 py-4 text-center">
                Loading assigned employees...
              </p>
            ) : currentScheduleAssignments.length > 0 ? (
              <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-300 bg-white">
                {currentScheduleAssignments.map((assignment) => {
                  const emp = employees.find((e) => e.id === assignment.employeeId)
                  return (
                    <div
                      key={assignment.id || assignment.employeeId}
                      className="flex items-center justify-between px-3 py-2 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-black">
                          {getEmployeeName(emp)}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {emp?.employeeCode ?? "No Code"} · Effective from: {assignment.effectiveFrom}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`Remove assignment for ${getEmployeeName(emp)}`}
                        onClick={() =>
                          removeEmployeeMutation.mutate({
                            employeeId: assignment.employeeId,
                            scheduleId: managingSchedule!.id,
                          })
                        }
                        disabled={removeEmployeeMutation.isPending}
                        className="h-7 text-[11px]"
                      >
                        <Trash2 className="h-3 w-3 mr-1 text-zinc-500" />
                        Remove
                      </Button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center text-xs text-zinc-500">
                No employees are currently assigned to this schedule.
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => setManagingSchedule(null)}>Close</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
