"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Plus, Search, Trash2, Wallet, X } from "lucide-react"
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
import type { TimeOffType } from "./Types"

type Allocation = {
  id: string
  employeeId: string
  employeeCode: string
  employeeName: string
  timeOffTypeId: string
  typeName: string
  typeCode: string
  unit: string
  colorHex: string
  allocatedDays: string
  consumedDays: string
  remainingDays: string
  status: "draft" | "approved" | "refused"
  validFrom: string
  validTo: string | null
  notes: string | null
}

type EmployeeOption = {
  id: string
  employeeCode: string
  fullName: string
}

const emptyForm = {
  employeeId: "",
  timeOffTypeId: "",
  allocatedDays: "",
  validFrom: `${new Date().getUTCFullYear()}-01-01`,
  validTo: `${new Date().getUTCFullYear()}-12-31`,
  notes: "",
}

function statusVariant(status: Allocation["status"]) {
  if (status === "approved") return "active" as const
  if (status === "refused") return "inactive" as const
  return "draft" as const
}

export default function Allocations() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState("")

  const allocationsQuery = useQuery({
    queryKey: ["leave-allocations"],
    queryFn: () => apiRequest<Allocation[]>("/api/leave-allocations"),
  })
  const typesQuery = useQuery({
    queryKey: ["time-off-types"],
    queryFn: () => apiRequest<TimeOffType[]>("/api/time-off-types"),
  })
  const employeesQuery = useQuery({
    queryKey: ["employees"],
    queryFn: () => apiRequest<EmployeeOption[]>("/api/employees"),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["leave-allocations"] })
    queryClient.invalidateQueries({ queryKey: ["leave-balances"] })
    queryClient.invalidateQueries({ queryKey: ["time-off-types"] })
  }

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/leave-allocations", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          allocatedDays: Number(form.allocatedDays),
          validTo: form.validTo || null,
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
    mutationFn: ({ id, action }: { id: string; action: "approve" | "refuse" }) =>
      apiRequest(`/api/leave-allocations/${id}/${action}`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    onSuccess: invalidate,
    onError: (error: Error) => setSaveError(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/leave-allocations/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
    onError: (error: Error) => setSaveError(error.message),
  })

  const allocations = useMemo(() => allocationsQuery.data ?? [], [allocationsQuery.data])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return allocations.filter((allocation) => {
      const matchesSearch =
        !query ||
        allocation.employeeName.toLowerCase().includes(query) ||
        allocation.typeName.toLowerCase().includes(query)
      const matchesStatus =
        statusFilter === "all" || allocation.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [allocations, search, statusFilter])

  const totals = useMemo(
    () =>
      allocations
        .filter((allocation) => allocation.status === "approved")
        .reduce(
          (acc, allocation) => ({
            allocated: acc.allocated + Number(allocation.allocatedDays),
            taken: acc.taken + Number(allocation.consumedDays),
            remaining: acc.remaining + Number(allocation.remainingDays),
          }),
          { allocated: 0, taken: 0, remaining: 0 },
        ),
    [allocations],
  )

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}

    if (!form.employeeId) nextErrors.employeeId = "Employee is required"
    if (!form.timeOffTypeId) nextErrors.timeOffTypeId = "Time off type is required"
    if (!form.allocatedDays || Number(form.allocatedDays) <= 0) {
      nextErrors.allocatedDays = "Enter a positive number of days"
    }
    if (!form.validFrom) nextErrors.validFrom = "Valid-from date is required"
    if (form.validTo && form.validTo < form.validFrom) {
      nextErrors.validTo = "Valid-to cannot be before valid-from"
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    createMutation.mutate()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-black">Allocations</h2>
          <p className="text-xs text-zinc-500">
            Leave balances per employee. Approved requests consume these
            automatically.
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
          New Allocation
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Days allocated", value: totals.allocated },
          { label: "Days taken", value: totals.taken },
          { label: "Days remaining", value: totals.remaining },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-zinc-300 bg-white p-4 shadow-sm"
          >
            <div className="text-xs font-medium text-zinc-500">{card.label}</div>
            <div className="mt-1 text-xl font-bold tabular-nums text-black">
              {card.value.toFixed(0)}
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
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="md:w-44"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
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
              <TableHead className="font-semibold text-black">Allocated</TableHead>
              <TableHead className="font-semibold text-black">Taken</TableHead>
              <TableHead className="font-semibold text-black">Remaining</TableHead>
              <TableHead className="font-semibold text-black">Validity</TableHead>
              <TableHead className="font-semibold text-black">Status</TableHead>
              <TableHead className="text-right font-semibold text-black">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((allocation) => (
                <TableRow
                  key={allocation.id}
                  className="border-zinc-200 hover:bg-zinc-50"
                >
                  <TableCell className="font-semibold text-black">
                    {allocation.employeeName}
                    <div className="font-mono text-[11px] font-normal text-zinc-500">
                      {allocation.employeeCode}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full border border-zinc-300"
                        style={{ backgroundColor: allocation.colorHex }}
                      />
                      <span className="text-xs text-zinc-700">
                        {allocation.typeName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-zinc-800">
                    {Number(allocation.allocatedDays).toFixed(1)}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-zinc-800">
                    {Number(allocation.consumedDays).toFixed(1)}
                  </TableCell>
                  <TableCell className="text-xs font-bold tabular-nums text-black">
                    {Number(allocation.remainingDays).toFixed(1)}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-zinc-600">
                    {allocation.validFrom} → {allocation.validTo ?? "open"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(allocation.status)}>
                      {allocation.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {allocation.status !== "approved" && (
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            reviewMutation.mutate({
                              id: allocation.id,
                              action: "approve",
                            })
                          }
                        >
                          <Check className="h-3 w-3" />
                          Approve
                        </Button>
                      )}
                      {allocation.status !== "refused" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            reviewMutation.mutate({
                              id: allocation.id,
                              action: "refuse",
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
                        disabled={Number(allocation.consumedDays) > 0}
                        title={
                          Number(allocation.consumedDays) > 0
                            ? "Days already consumed — refuse it instead"
                            : "Delete allocation"
                        }
                        onClick={() => deleteMutation.mutate(allocation.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-48 text-center">
                  <div className="flex flex-col items-center gap-2 text-zinc-500">
                    <Wallet className="h-8 w-8 text-zinc-300" />
                    <p className="font-semibold text-black">No allocations found</p>
                    <p className="text-xs">
                      Allocate leave before employees can request it.
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
          <DialogTitle>New Leave Allocation</DialogTitle>
          <DialogDescription>
            Allocations must be approved before the balance becomes available.
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">
                Time off type
              </label>
              <Select
                value={form.timeOffTypeId}
                onChange={(event) =>
                  setForm({ ...form, timeOffTypeId: event.target.value })
                }
              >
                <option value="">Select type</option>
                {(typesQuery.data ?? [])
                  .filter((type) => type.isActive)
                  .map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
              </Select>
              {errors.timeOffTypeId && (
                <p className="text-[11px] font-medium text-black">
                  {errors.timeOffTypeId}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">
                Days allocated
              </label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={form.allocatedDays}
                onChange={(event) =>
                  setForm({ ...form, allocatedDays: event.target.value })
                }
                placeholder="e.g. 18"
              />
              {errors.allocatedDays && (
                <p className="text-[11px] font-medium text-black">
                  {errors.allocatedDays}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">
                Valid from
              </label>
              <Input
                type="date"
                value={form.validFrom}
                onChange={(event) =>
                  setForm({ ...form, validFrom: event.target.value })
                }
              />
              {errors.validFrom && (
                <p className="text-[11px] font-medium text-black">
                  {errors.validFrom}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">Valid to</label>
              <Input
                type="date"
                value={form.validTo}
                onChange={(event) =>
                  setForm({ ...form, validTo: event.target.value })
                }
              />
              {errors.validTo && (
                <p className="text-[11px] font-medium text-black">
                  {errors.validTo}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-black">Notes</label>
            <textarea
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="e.g. Annual entitlement for 2026"
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
              Create Allocation
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}
