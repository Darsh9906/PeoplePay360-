"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Clock, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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

type AttendanceRow = {
  id: string
  attendanceDate: string
  checkIn: string | null
  checkOut: string | null
  workedHours: string
  status: "present" | "late" | "absent" | "half_day"
}

const statusLabels: Record<AttendanceRow["status"], string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  half_day: "Half day",
}

function statusVariant(status: AttendanceRow["status"]) {
  if (status === "present") return "active" as const
  if (status === "late") return "expiring" as const
  if (status === "half_day") return "draft" as const
  return "inactive" as const
}

function time(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** First and last day of the current month, as yyyy-mm-dd. */
function currentMonthRange() {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  }
}

export default function MyAttendance() {
  const initial = currentMonthRange()
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [status, setStatus] = useState("all")

  // The API scopes this to the signed-in employee automatically.
  const attendanceQuery = useQuery({
    queryKey: ["my-attendance", from, to],
    queryFn: () => {
      const params = new URLSearchParams()
      if (from) params.set("from", from)
      if (to) params.set("to", to)
      return apiRequest<AttendanceRow[]>(`/api/attendance?${params.toString()}`)
    },
  })

  const rows = useMemo(() => attendanceQuery.data ?? [], [attendanceQuery.data])

  const filtered = useMemo(
    () => (status === "all" ? rows : rows.filter((row) => row.status === status)),
    [rows, status],
  )

  const summary = useMemo(() => {
    const totals = { present: 0, late: 0, absent: 0, half_day: 0, hours: 0 }

    for (const row of rows) {
      totals[row.status] += 1
      totals.hours += Number(row.workedHours ?? 0)
    }

    return totals
  }, [rows])

  return (
    <div className="space-y-6">
      <header className="border-b border-zinc-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-black">
          My Attendance
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Your check-in history for the selected period.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { label: "Present", value: summary.present },
          { label: "Late", value: summary.late },
          { label: "Half day", value: summary.half_day },
          { label: "Absent", value: summary.absent },
          { label: "Hours worked", value: summary.hours.toFixed(1) },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-zinc-300 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-medium text-zinc-500">{card.label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-black">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-zinc-300 bg-white p-4 shadow-sm md:flex-row md:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-[11px] font-semibold text-zinc-600">
            From
          </label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-[11px] font-semibold text-zinc-600">
            To
          </label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-[11px] font-semibold text-zinc-600">
            Status
          </label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="half_day">Half day</option>
            <option value="absent">Absent</option>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 bg-zinc-50">
              <TableHead className="font-semibold text-black">Date</TableHead>
              <TableHead className="font-semibold text-black">Check in</TableHead>
              <TableHead className="font-semibold text-black">Check out</TableHead>
              <TableHead className="font-semibold text-black">Worked hours</TableHead>
              <TableHead className="text-right font-semibold text-black">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendanceQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-sm text-zinc-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </span>
                </TableCell>
              </TableRow>
            ) : filtered.length > 0 ? (
              filtered.map((row) => (
                <TableRow key={row.id} className="border-zinc-200 hover:bg-zinc-50">
                  <TableCell className="font-mono text-xs text-zinc-800">
                    {row.attendanceDate}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-zinc-800">
                    {time(row.checkIn)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-zinc-800">
                    {time(row.checkOut)}
                  </TableCell>
                  <TableCell className="text-xs font-semibold tabular-nums text-black">
                    {Number(row.workedHours).toFixed(2)} hrs
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={statusVariant(row.status)}>
                      {statusLabels[row.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-zinc-500">
                    <Clock className="h-7 w-7 text-zinc-300" />
                    <p className="text-sm font-semibold text-black">
                      No attendance in this period
                    </p>
                    <p className="text-xs">Try widening the date range.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
