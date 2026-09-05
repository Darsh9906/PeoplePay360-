"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CalendarDays, Loader2, Plus } from "lucide-react"
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
import { useAuth } from "@/src/context/AuthContext"
import { apiRequest } from "@/src/lib/api"

type Balance = {
  timeOffTypeId: string
  typeName: string
  colorHex: string
  allocated: string
  taken: string
  remaining: string
}

type Request = {
  id: string
  timeOffTypeId: string | null
  typeName: string
  colorHex: string | null
  isPaid: boolean | null
  startDate: string
  endDate: string
  durationDays: string
  status: "submitted" | "approved" | "refused"
  reason: string | null
  rejectedReason: string | null
}

type TimeOffType = {
  id: string
  name: string
  isActive: boolean
  isPaid: boolean
  requiresAllocation: boolean
}

const emptyForm = { timeOffTypeId: "", startDate: "", endDate: "", reason: "" }

function statusLabel(status: Request["status"]) {
  if (status === "approved") return "Approved"
  if (status === "refused") return "Refused"
  return "Pending"
}

function statusVariant(status: Request["status"]) {
  if (status === "approved") return "active" as const
  if (status === "refused") return "inactive" as const
  return "expiring" as const
}

/** Inclusive day count between two dates. */
function daysBetween(startDate: string, endDate: string) {
  if (!startDate || !endDate) return 0
  const start = new Date(`${startDate}T00:00:00Z`).getTime()
  const end = new Date(`${endDate}T00:00:00Z`).getTime()
  return Math.max(Math.round((end - start) / 86_400_000) + 1, 0)
}

export default function MyTimeOff() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const employeeId = user?.employee?.id

  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")

  // All three endpoints scope themselves to the signed-in employee.
  const requestsQuery = useQuery({
    queryKey: ["my-time-off"],
    queryFn: () => apiRequest<Request[]>("/api/time-off"),
  })
  const balancesQuery = useQuery({
    queryKey: ["my-leave-balances"],
    queryFn: () => apiRequest<Balance[]>("/api/leave-balances"),
  })
  const typesQuery = useQuery({
    queryKey: ["time-off-types"],
    queryFn: () => apiRequest<TimeOffType[]>("/api/time-off-types?active=true"),
  })

  const requests = useMemo(() => requestsQuery.data ?? [], [requestsQuery.data])
  const balances = useMemo(() => balancesQuery.data ?? [], [balancesQuery.data])
  const types = useMemo(
    () => (typesQuery.data ?? []).filter((type) => type.isActive),
    [typesQuery.data],
  )

  const requestedDays = daysBetween(form.startDate, form.endDate)
  const selectedBalance = balances.find(
    (balance) => balance.timeOffTypeId === form.timeOffTypeId,
  )

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/time-off", {
        method: "POST",
        body: JSON.stringify({
          employeeId,
          timeOffTypeId: form.timeOffTypeId,
          startDate: form.startDate,
          endDate: form.endDate,
          durationDays: requestedDays,
          status: "submitted",
          reason: form.reason,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-time-off"] })
      queryClient.invalidateQueries({ queryKey: ["my-leave-balances"] })
      setIsOpen(false)
      setForm(emptyForm)
      setServerError("")
    },
    onError: (error: Error) => setServerError(error.message),
  })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const next: Record<string, string> = {}

    if (!form.timeOffTypeId) next.timeOffTypeId = "Choose a leave type"
    if (!form.startDate) next.startDate = "Start date is required"
    if (!form.endDate) next.endDate = "End date is required"
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      next.endDate = "End date cannot be before the start date"
    }

    setErrors(next)
    if (Object.keys(next).length > 0) return

    createMutation.mutate()
  }

  if (!employeeId) {
    return (
      <div className="space-y-6">
        <header className="border-b border-zinc-200 pb-5">
          <h1 className="text-2xl font-bold tracking-tight text-black">My Time Off</h1>
        </header>
        <div className="rounded-xl border border-zinc-300 bg-white p-10 text-center shadow-sm">
          <CalendarDays className="mx-auto h-6 w-6 text-zinc-300" />
          <p className="mt-2 text-sm font-semibold text-black">
            No employee record is linked to your account
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Ask your HR team to link it before requesting leave.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black">My Time Off</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Your leave balances and requests.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm)
            setErrors({})
            setServerError("")
            setIsOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          Request Time Off
        </Button>
      </header>

      {/* Balances */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {balances.length > 0 ? (
          balances.map((balance) => {
            const allocated = Number(balance.allocated)
            const remaining = Number(balance.remaining)
            const used = allocated > 0 ? ((allocated - remaining) / allocated) * 100 : 0

            return (
              <div
                key={balance.timeOffTypeId}
                className="rounded-xl border border-zinc-300 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-zinc-300"
                    style={{ backgroundColor: balance.colorHex }}
                  />
                  <p className="text-sm font-semibold text-black">
                    {balance.typeName}
                  </p>
                </div>
                <p className="mt-2 text-2xl font-bold tabular-nums text-black">
                  {remaining.toFixed(1)}
                  <span className="ml-1 text-sm font-medium text-zinc-500">
                    of {allocated.toFixed(0)} days left
                  </span>
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-black"
                    style={{ width: `${Math.min(Math.max(used, 0), 100)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  {Number(balance.taken).toFixed(1)} day(s) taken
                </p>
              </div>
            )
          })
        ) : (
          <div className="rounded-xl border border-zinc-300 bg-white p-6 text-sm text-zinc-500 shadow-sm sm:col-span-2 lg:col-span-3">
            No leave has been allocated to you yet.
          </div>
        )}
      </div>

      {/* Requests */}
      <div className="overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-4">
          <h2 className="text-sm font-bold text-black">My requests</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 bg-zinc-50">
              <TableHead className="font-semibold text-black">Type</TableHead>
              <TableHead className="font-semibold text-black">Dates</TableHead>
              <TableHead className="font-semibold text-black">Duration</TableHead>
              <TableHead className="font-semibold text-black">Reason</TableHead>
              <TableHead className="text-right font-semibold text-black">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requestsQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-sm text-zinc-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </span>
                </TableCell>
              </TableRow>
            ) : requests.length > 0 ? (
              requests.map((request) => (
                <TableRow key={request.id} className="border-zinc-200">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {request.colorHex && (
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-zinc-300"
                          style={{ backgroundColor: request.colorHex }}
                        />
                      )}
                      <span className="text-sm font-medium text-black">
                        {request.typeName}
                      </span>
                      {request.isPaid === false && (
                        <Badge variant="outline">Unpaid</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-zinc-600">
                    {request.startDate} → {request.endDate}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-zinc-800">
                    {Number(request.durationDays).toFixed(1)} d
                  </TableCell>
                  <TableCell className="max-w-[220px] text-xs text-zinc-600">
                    {request.status === "refused" && request.rejectedReason
                      ? request.rejectedReason
                      : (request.reason ?? "—")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={statusVariant(request.status)}>
                      {statusLabel(request.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-zinc-500">
                    <CalendarDays className="h-7 w-7 text-zinc-300" />
                    <p className="text-sm font-semibold text-black">
                      No requests yet
                    </p>
                    <p className="text-xs">
                      Use Request Time Off to submit your first one.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogHeader>
          <DialogTitle>Request Time Off</DialogTitle>
          <DialogDescription>
            Your request goes to HR for approval.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-black">Leave type</label>
            <Select
              value={form.timeOffTypeId}
              onChange={(event) => {
                setForm({ ...form, timeOffTypeId: event.target.value })
                setErrors((current) => ({ ...current, timeOffTypeId: "" }))
              }}
            >
              <option value="">Select leave type</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                  {type.isPaid ? "" : " (unpaid)"}
                </option>
              ))}
            </Select>
            {errors.timeOffTypeId ? (
              <p className="text-[11px] font-medium text-black">
                {errors.timeOffTypeId}
              </p>
            ) : (
              selectedBalance && (
                <p className="text-[11px] text-zinc-500">
                  {Number(selectedBalance.remaining).toFixed(1)} of{" "}
                  {Number(selectedBalance.allocated).toFixed(1)} day(s) remaining
                </p>
              )
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">Start date</label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(event) => {
                  setForm({ ...form, startDate: event.target.value })
                  setErrors((current) => ({ ...current, startDate: "" }))
                }}
              />
              {errors.startDate && (
                <p className="text-[11px] font-medium text-black">
                  {errors.startDate}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">End date</label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(event) => {
                  setForm({ ...form, endDate: event.target.value })
                  setErrors((current) => ({ ...current, endDate: "" }))
                }}
              />
              {errors.endDate && (
                <p className="text-[11px] font-medium text-black">{errors.endDate}</p>
              )}
            </div>
          </div>

          {requestedDays > 0 && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
              Duration:{" "}
              <span className="font-semibold text-black">
                {requestedDays} day{requestedDays === 1 ? "" : "s"}
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-black">Reason</label>
            <textarea
              value={form.reason}
              onChange={(event) => setForm({ ...form, reason: event.target.value })}
              placeholder="Add a short reason"
              className="min-h-16 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black outline-none placeholder:text-zinc-400 focus:ring-1 focus:ring-black"
            />
          </div>

          {serverError && (
            <div className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-medium text-black">
              {serverError}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              Submit request
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}
