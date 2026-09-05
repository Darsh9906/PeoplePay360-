"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CalendarDays, Check, Eye, Plus, Search, X } from "lucide-react"
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
import type { TimeOffType } from "./Types"

type TimeOffRequest = {
  id: string
  employeeId: string
  employeeCode: string
  employeeName: string
  timeOffTypeId: string | null
  typeName: string
  colorHex: string | null
  isPaid: boolean | null
  requiresAllocation: boolean | null
  allocationId: string | null
  startDate: string
  endDate: string
  durationDays: string
  status: "submitted" | "approved" | "refused"
  reason: string | null
  rejectedReason: string | null
}

type EmployeeOption = {
  id: string
  employeeCode: string
  fullName: string
}

type LeaveBalance = {
  employeeId: string
  timeOffTypeId: string
  typeName: string
  allocated: string
  taken: string
  remaining: string
}

const emptyForm = {
  employeeId: "",
  timeOffTypeId: "",
  startDate: "",
  endDate: "",
  reason: "",
}

function statusLabel(status: TimeOffRequest["status"]) {
  if (status === "approved") return "Approved"
  if (status === "refused") return "Refused"
  return "Pending"
}

function statusVariant(status: TimeOffRequest["status"]) {
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

export default function Requests() {
  const searchParams = useSearchParams()
  const employeeIdFilter = searchParams.get("employeeId")
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const canReview = user?.role !== "employee"
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isOpen, setIsOpen] = useState(false)
  const [viewing, setViewing] = useState<TimeOffRequest | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState("")

  const requestsQuery = useQuery({
    queryKey: ["time-off"],
    queryFn: () => apiRequest<TimeOffRequest[]>(employeeIdFilter ? `/api/time-off?employeeId=${encodeURIComponent(employeeIdFilter)}` : "/api/time-off"),
  })
  const typesQuery = useQuery({
    queryKey: ["time-off-types"],
    queryFn: () => apiRequest<TimeOffType[]>("/api/time-off-types"),
  })
  const employeesQuery = useQuery({
    queryKey: ["employees"],
    queryFn: () => apiRequest<EmployeeOption[]>("/api/employees"),
  })
  const balancesQuery = useQuery({
    queryKey: ["leave-balances"],
    queryFn: () => apiRequest<LeaveBalance[]>("/api/leave-balances"),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["time-off"] })
    queryClient.invalidateQueries({ queryKey: ["leave-allocations"] })
    queryClient.invalidateQueries({ queryKey: ["leave-balances"] })
  }

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/time-off", {
        method: "POST",
        body: JSON.stringify({
          employeeId: form.employeeId,
          timeOffTypeId: form.timeOffTypeId,
          startDate: form.startDate,
          endDate: form.endDate,
          durationDays: daysBetween(form.startDate, form.endDate),
          status: "submitted",
          reason: form.reason,
        }),
      }),
    onSuccess: () => {
      invalidate()
      setIsOpen(false)
      setForm(emptyForm)
      setSaveError("")
    },
    onError: (error: Error) => setSaveError(error.message),
  })

  const reviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) =>
      apiRequest(`/api/time-off/${id}/${action}`, {
        method: "POST",
        body: JSON.stringify(
          action === "reject"
            ? { rejectedReason: "Refused during HR review" }
            : {},
        ),
      }),
    onSuccess: invalidate,
    onError: (error: Error) => setSaveError(error.message),
  })

  const requests = useMemo(() => requestsQuery.data ?? [], [requestsQuery.data])
  const types = typesQuery.data ?? []

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return requests.filter((request) => {
      const matchesSearch =
        !query ||
        request.employeeName.toLowerCase().includes(query) ||
        request.typeName.toLowerCase().includes(query)
      const matchesType =
        typeFilter === "all" || request.timeOffTypeId === typeFilter
      const matchesStatus =
        statusFilter === "all" || request.status === statusFilter
      return matchesSearch && matchesType && matchesStatus
    })
  }, [requests, search, statusFilter, typeFilter])

  const pendingCount = requests.filter(
    (request) => request.status === "submitted",
  ).length
  const approvedDays = requests
    .filter((request) => request.status === "approved")
    .reduce((sum, request) => sum + Number(request.durationDays), 0)

  const requestedDays = daysBetween(form.startDate, form.endDate)
  const selectedType = types.find((type) => type.id === form.timeOffTypeId)

  // Live balance for the chosen employee + type, so over-booking is visible up front.
  const selectedBalance = (balancesQuery.data ?? []).find(
    (balance) =>
      balance.employeeId === form.employeeId &&
      balance.timeOffTypeId === form.timeOffTypeId,
  )

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}

    if (!form.employeeId) nextErrors.employeeId = "Employee is required"
    if (!form.timeOffTypeId) nextErrors.timeOffTypeId = "Leave type is required"
    if (!form.startDate) nextErrors.startDate = "Start date is required"
    if (!form.endDate) nextErrors.endDate = "End date is required"
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      nextErrors.endDate = "End date cannot be before the start date"
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    createMutation.mutate()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-black">Requests</h2>
          <p className="text-xs text-zinc-500">
            Approving a request draws the days down from the employee&apos;s
            allocation.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm)
            setErrors({})
            setSaveError("")
            setIsOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          Request Time Off
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Pending", value: pendingCount },
          {
            label: "Approved",
            value: requests.filter((r) => r.status === "approved").length,
          },
          {
            label: "Refused",
            value: requests.filter((r) => r.status === "refused").length,
          },
          { label: "Approved days", value: approvedDays.toFixed(0) },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-zinc-300 bg-white p-4 shadow-sm"
          >
            <div className="text-xs font-medium text-zinc-500">{card.label}</div>
            <div className="mt-1 text-xl font-bold tabular-nums text-black">
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {saveError && (
        <div className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-medium text-black">
          {saveError}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-zinc-300 bg-white p-4 shadow-sm md:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employee or leave type"
            className="pl-9"
          />
        </div>
        <Select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="md:w-48"
        >
          <option value="all">All leave types</option>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </Select>
        <Select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="md:w-40"
        >
          <option value="all">All statuses</option>
          <option value="submitted">Pending</option>
          <option value="approved">Approved</option>
          <option value="refused">Refused</option>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 bg-zinc-50">
              <TableHead className="font-semibold text-black">Employee</TableHead>
              <TableHead className="font-semibold text-black">Type</TableHead>
              <TableHead className="font-semibold text-black">Dates</TableHead>
              <TableHead className="font-semibold text-black">Duration</TableHead>
              <TableHead className="font-semibold text-black">Status</TableHead>
              <TableHead className="text-right font-semibold text-black">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((request) => (
                <TableRow
                  key={request.id}
                  className="border-zinc-200 hover:bg-zinc-50"
                >
                  <TableCell>
                    <Link
                      href={`/employees/${request.employeeId}`}
                      className="font-semibold text-black hover:underline"
                    >
                      {request.employeeName}
                    </Link>
                    <div className="font-mono text-[11px] text-zinc-500">
                      {request.employeeCode}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {request.colorHex && (
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full border border-zinc-300"
                          style={{ backgroundColor: request.colorHex }}
                        />
                      )}
                      <span className="text-xs text-zinc-700">
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
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={statusVariant(request.status)}>
                        {statusLabel(request.status)}
                      </Badge>
                      {request.status === "approved" && request.allocationId && (
                        <span
                          className="text-[11px] text-zinc-500"
                          title="Deducted from the employee's allocation"
                        >
                          balance applied
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canReview && request.status !== "approved" && (
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            reviewMutation.mutate({
                              id: request.id,
                              action: "approve",
                            })
                          }
                        >
                          <Check className="h-3 w-3" />
                          Approve
                        </Button>
                      )}
                      {canReview && request.status !== "refused" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            reviewMutation.mutate({
                              id: request.id,
                              action: "reject",
                            })
                          }
                        >
                          <X className="h-3 w-3" />
                          Refuse
                        </Button>
                      )}
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`View ${request.employeeName} request`}
                        onClick={() => setViewing(request)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center">
                  <div className="flex flex-col items-center gap-2 text-zinc-500">
                    <CalendarDays className="h-8 w-8 text-zinc-300" />
                    <p className="font-semibold text-black">No requests found</p>
                    <p className="text-xs">Try changing the search or filters.</p>
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
            Submit a leave request for review.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-black">Employee</label>
            <Select
              value={form.employeeId}
              onChange={(event) =>
                setForm({ ...form, employeeId: event.target.value })
              }
            >
              <option value="">Select employee</option>
              {(employeesQuery.data ?? []).map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName} ({employee.employeeCode})
                </option>
              ))}
            </Select>
            {errors.employeeId && (
              <p className="text-[11px] font-medium text-black">
                {errors.employeeId}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-black">Leave type</label>
            <Select
              value={form.timeOffTypeId}
              onChange={(event) =>
                setForm({ ...form, timeOffTypeId: event.target.value })
              }
            >
              <option value="">Select leave type</option>
              {types
                .filter((type) => type.isActive)
                .map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                    {type.isPaid ? "" : " (unpaid)"}
                  </option>
                ))}
            </Select>
            {errors.timeOffTypeId && (
              <p className="text-[11px] font-medium text-black">
                {errors.timeOffTypeId}
              </p>
            )}
            {selectedType?.requiresAllocation && form.employeeId && (
              <p className="text-[11px] text-zinc-500">
                {selectedBalance
                  ? `Balance: ${Number(selectedBalance.remaining).toFixed(1)} of ${Number(selectedBalance.allocated).toFixed(1)} day(s) remaining`
                  : "No approved allocation for this type — create one first."}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">
                Start date
              </label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm({ ...form, startDate: event.target.value })
                }
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
                onChange={(event) =>
                  setForm({ ...form, endDate: event.target.value })
                }
              />
              {errors.endDate && (
                <p className="text-[11px] font-medium text-black">
                  {errors.endDate}
                </p>
              )}
            </div>
          </div>

          {requestedDays > 0 && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
              Duration:{" "}
              <span className="font-semibold text-black">
                {requestedDays} day{requestedDays === 1 ? "" : "s"}
              </span>
              {selectedBalance &&
                requestedDays > Number(selectedBalance.remaining) && (
                  <span className="ml-2 font-semibold text-black">
                    · exceeds the remaining balance
                  </span>
                )}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-black">Reason</label>
            <textarea
              value={form.reason}
              onChange={(event) =>
                setForm({ ...form, reason: event.target.value })
              }
              placeholder="Add a short reason"
              className="min-h-16 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black outline-none placeholder:text-zinc-400 focus:ring-1 focus:ring-black"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      <Dialog open={Boolean(viewing)} onOpenChange={() => setViewing(null)}>
        <DialogHeader>
          <DialogTitle>Time Off Request</DialogTitle>
          <DialogDescription>Request details.</DialogDescription>
        </DialogHeader>
        {viewing && (
          <div className="space-y-3 text-sm">
            {[
              { label: "Employee", value: viewing.employeeName },
              { label: "Leave type", value: viewing.typeName },
              {
                label: "Period",
                value: `${viewing.startDate} → ${viewing.endDate}`,
              },
              {
                label: "Duration",
                value: `${Number(viewing.durationDays).toFixed(1)} day(s)`,
              },
              { label: "Reason", value: viewing.reason || "—" },
              ...(viewing.rejectedReason
                ? [{ label: "Refusal reason", value: viewing.rejectedReason }]
                : []),
            ].map((row) => (
              <div
                key={row.label}
                className="flex justify-between border-b border-zinc-200 pb-2"
              >
                <span className="text-zinc-500">{row.label}</span>
                <strong className="text-right text-black">{row.value}</strong>
              </div>
            ))}
            <div className="flex justify-between">
              <span className="text-zinc-500">Status</span>
              <Badge variant={statusVariant(viewing.status)}>
                {statusLabel(viewing.status)}
              </Badge>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button onClick={() => setViewing(null)}>Close</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
