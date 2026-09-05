"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CalendarClock, Edit2, Eye, Plus, Trash2, XCircle } from "lucide-react"
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
  const [name, setName] = useState("")
  const [status, setStatus] = useState<"active" | "inactive">("active")
  const [rows, setRows] = useState<DayRow[]>(defaultRows())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState("")

  const schedulesQuery = useQuery({
    queryKey: ["schedules"],
    queryFn: () => apiRequest<BackendSchedule[]>("/api/schedules"),
  })

  const schedules = schedulesQuery.data ?? []

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] }),
    onError: (error: Error) => setSaveError(error.message),
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

      {saveError && (
        <div className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-medium text-black">
          {saveError}
        </div>
      )}

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
              <TableHead className="font-semibold text-black">Status</TableHead>
              <TableHead className="text-right font-semibold text-black">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedulesQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-sm text-zinc-500">
                  Loading schedules...
                </TableCell>
              </TableRow>
            ) : schedules.length > 0 ? (
              schedules.map((schedule) => {
                const daysCount = schedule.lines?.length ?? 0
                const hours = Number(schedule.weeklyHours)

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
                          .map((day) => day.slice(0, 3))
                          .join(", ")}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-bold tabular-nums text-black">
                      {hours.toFixed(2)} hrs
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
                          onClick={() => setViewing(schedule)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Edit ${schedule.name}`}
                          onClick={() => openEdit(schedule)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Delete ${schedule.name}`}
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
                <TableCell colSpan={6} className="h-56 text-center">
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
    </div>
  )
}
