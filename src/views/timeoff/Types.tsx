"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Pencil, Plus, Settings2, Trash2 } from "lucide-react"
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

export type TimeOffType = {
  id: string
  name: string
  code: string
  unit: "days" | "hours"
  requiresAllocation: boolean
  requiresApproval: boolean
  isPaid: boolean
  affectsPayroll: boolean
  colorHex: string
  isActive: boolean
  allocationCount: number
  requestCount: number
}

const emptyForm = {
  name: "",
  code: "",
  unit: "days" as "days" | "hours",
  requiresAllocation: true,
  requiresApproval: true,
  isPaid: true,
  affectsPayroll: true,
  colorHex: "#2563eb",
  isActive: true,
}

type FormState = typeof emptyForm

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-zinc-200 p-3">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-black"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <span className="block text-xs font-semibold text-black">{label}</span>
        <span className="block text-[11px] text-zinc-500">{hint}</span>
      </span>
    </label>
  )
}

export default function TimeOffTypes() {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<TimeOffType | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState("")

  const typesQuery = useQuery({
    queryKey: ["time-off-types"],
    queryFn: () => apiRequest<TimeOffType[]>("/api/time-off-types"),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["time-off-types"] })
    queryClient.invalidateQueries({ queryKey: ["leave-allocations"] })
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? apiRequest(`/api/time-off-types/${editing.id}`, {
            method: "PATCH",
            body: JSON.stringify(form),
          })
        : apiRequest("/api/time-off-types", {
            method: "POST",
            body: JSON.stringify(form),
          }),
    onSuccess: () => {
      invalidate()
      setIsOpen(false)
      setSaveError("")
    },
    onError: (error: Error) => setSaveError(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/time-off-types/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
    onError: (error: Error) => setSaveError(error.message),
  })

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setErrors({})
    setSaveError("")
    setIsOpen(true)
  }

  function openEdit(type: TimeOffType) {
    setEditing(type)
    setForm({
      name: type.name,
      code: type.code,
      unit: type.unit,
      requiresAllocation: type.requiresAllocation,
      requiresApproval: type.requiresApproval,
      isPaid: type.isPaid,
      affectsPayroll: type.affectsPayroll,
      colorHex: type.colorHex,
      isActive: type.isActive,
    })
    setErrors({})
    setSaveError("")
    setIsOpen(true)
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}

    if (!form.name.trim()) nextErrors.name = "Name is required"
    if (!form.code.trim()) nextErrors.code = "Code is required"

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    saveMutation.mutate()
  }

  const types = typesQuery.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-black">Time Off Types</h2>
          <p className="text-xs text-zinc-500">
            Leave policies: unit, allocation requirement, approval flow, and
            payroll treatment.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Type
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
              <TableHead className="font-semibold text-black">Type</TableHead>
              <TableHead className="font-semibold text-black">Unit</TableHead>
              <TableHead className="font-semibold text-black">Policy</TableHead>
              <TableHead className="font-semibold text-black">Payroll</TableHead>
              <TableHead className="font-semibold text-black">Usage</TableHead>
              <TableHead className="text-right font-semibold text-black">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {types.length > 0 ? (
              types.map((type) => (
                <TableRow key={type.id} className="border-zinc-200 hover:bg-zinc-50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full border border-zinc-300"
                        style={{ backgroundColor: type.colorHex }}
                      />
                      <div>
                        <div className="font-semibold text-black">{type.name}</div>
                        <div className="font-mono text-[11px] text-zinc-500">
                          {type.code}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs capitalize text-zinc-700">
                    {type.unit}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {type.requiresAllocation && (
                        <Badge variant="outline">Allocation required</Badge>
                      )}
                      {type.requiresApproval && (
                        <Badge variant="outline">Approval required</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={type.isPaid ? "active" : "inactive"}>
                      {type.isPaid ? "Paid" : "Unpaid"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-zinc-600">
                    {type.allocationCount} allocation(s) · {type.requestCount}{" "}
                    request(s)
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => openEdit(type)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        disabled={
                          type.allocationCount > 0 || type.requestCount > 0
                        }
                        title={
                          type.allocationCount > 0 || type.requestCount > 0
                            ? "In use — deactivate it instead"
                            : "Delete type"
                        }
                        onClick={() => deleteMutation.mutate(type.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center">
                  <div className="flex flex-col items-center gap-2 text-zinc-500">
                    <Settings2 className="h-8 w-8 text-zinc-300" />
                    <p className="font-semibold text-black">
                      No time off types configured
                    </p>
                    <p className="text-xs">
                      Create a type before allocating leave balances.
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
          <DialogTitle>
            {editing ? "Edit Time Off Type" : "New Time Off Type"}
          </DialogTitle>
          <DialogDescription>
            These settings drive allocations, approvals, and payroll treatment.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">Name</label>
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="e.g. Earned Leave"
              />
              {errors.name && (
                <p className="text-[11px] font-medium text-black">
                  {errors.name}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">Code</label>
              <Input
                value={form.code}
                onChange={(event) =>
                  setForm({ ...form, code: event.target.value.toUpperCase() })
                }
                placeholder="e.g. EL"
              />
              {errors.code && (
                <p className="text-[11px] font-medium text-black">
                  {errors.code}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">Unit</label>
              <Select
                value={form.unit}
                onChange={(event) =>
                  setForm({
                    ...form,
                    unit: event.target.value as "days" | "hours",
                  })
                }
              >
                <option value="days">Days</option>
                <option value="hours">Hours</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black">Colour</label>
              <Input
                type="color"
                value={form.colorHex}
                onChange={(event) =>
                  setForm({ ...form, colorHex: event.target.value })
                }
                className="h-9 p-1"
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle
              label="Requires allocation"
              hint="Requests draw down from an approved balance."
              checked={form.requiresAllocation}
              onChange={(value) =>
                setForm({ ...form, requiresAllocation: value })
              }
            />
            <Toggle
              label="Requires approval"
              hint="Requests must be reviewed before taking effect."
              checked={form.requiresApproval}
              onChange={(value) => setForm({ ...form, requiresApproval: value })}
            />
            <Toggle
              label="Paid leave"
              hint="Unpaid leave prorates salary in payroll."
              checked={form.isPaid}
              onChange={(value) => setForm({ ...form, isPaid: value })}
            />
            <Toggle
              label="Active"
              hint="Inactive types are hidden from new requests."
              checked={form.isActive}
              onChange={(value) => setForm({ ...form, isActive: value })}
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
            <Button type="submit" disabled={saveMutation.isPending}>
              {editing ? "Save Changes" : "Create Type"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}
