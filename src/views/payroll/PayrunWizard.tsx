"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Loader2, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { formatINR } from "@/src/lib/format"
import { apiRequest } from "@/src/lib/api"

type EligibleEmployee = {
  id: string
  employeeCode: string
  employeeName: string
  jobTitle: string
  department: string | null
  departmentId: string
  monthlyWage: string | null
  contractId: string | null
  hasBankAccount: boolean
  eligible: boolean
  issues: string[]
}

type Department = { id: string; name: string }

type StructureOption = { id: string; name: string; code: string }

type ScopeState = {
  name: string
  salaryStructureId: string
  periodStart: string
  periodEnd: string
  departmentId: string
}

/** Defaults the period to the previous whole month, which is the usual pay cycle. */
function defaultPeriod() {
  const today = new Date()
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1))
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0))

  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
  }
}

function periodLabel(periodStart: string) {
  if (!periodStart) return "Payroll"
  return new Date(`${periodStart}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
}

export default function PayrunWizard({
  structures,
  onCancel,
}: {
  structures: StructureOption[]
  onCancel: () => void
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const initialPeriod = defaultPeriod()

  const [step, setStep] = useState<1 | 2>(1)
  const [scope, setScope] = useState<ScopeState>({
    name: "",
    salaryStructureId: "",
    periodStart: initialPeriod.periodStart,
    periodEnd: initialPeriod.periodEnd,
    departmentId: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState("")

  const departmentsQuery = useQuery({
    queryKey: ["departments"],
    queryFn: () => apiRequest<Department[]>("/api/departments"),
  })

  // Step 2 only: eligibility depends on the scope chosen in step 1.
  const eligibleQuery = useQuery({
    queryKey: ["payrun-eligible", scope.periodStart, scope.periodEnd, scope.departmentId],
    enabled: step === 2,
    queryFn: () => {
      const params = new URLSearchParams({
        periodStart: scope.periodStart,
        periodEnd: scope.periodEnd,
      })
      if (scope.departmentId) params.set("departmentId", scope.departmentId)
      return apiRequest<EligibleEmployee[]>(
        `/api/payruns/eligible-employees?${params.toString()}`,
      )
    },
  })

  const employees = useMemo(() => eligibleQuery.data ?? [], [eligibleQuery.data])
  const defaultStructureId = structures[0]?.id ?? ""
  const selectedStructureId = scope.salaryStructureId || defaultStructureId
  const selectable = useMemo(
    () => employees.filter((employee) => employee.eligible),
    [employees],
  )

  const selectedTotal = useMemo(
    () =>
      employees
        .filter((employee) => selectedIds.includes(employee.id))
        .reduce((sum, employee) => sum + Number(employee.monthlyWage ?? 0), 0),
    [employees, selectedIds],
  )

  const structureName =
    structures.find((structure) => structure.id === selectedStructureId)?.name ??
    "Not set"

  function validateScope() {
    const nextErrors: Record<string, string> = {}

    if (!selectedStructureId) {
      nextErrors.salaryStructureId = "Select the salary structure to apply"
    }
    if (!scope.periodStart) {
      nextErrors.periodStart = "Start date is required"
    }
    if (!scope.periodEnd) {
      nextErrors.periodEnd = "End date is required"
    }
    if (scope.periodStart && scope.periodEnd && scope.periodEnd < scope.periodStart) {
      nextErrors.periodEnd = "End date cannot be before the start date"
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  /** Step 1 → Step 2. Deliberately does not create the payrun yet. */
  function handleContinue() {
    if (!validateScope()) return
    setSelectedIds([])
    setStep(2)
  }

  function toggleEmployee(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    )
  }

  function toggleAll() {
    setSelectedIds((current) =>
      current.length === selectable.length
        ? []
        : selectable.map((employee) => employee.id),
    )
  }

  /** Step 2 → the payrun record is created here, with only the chosen employees. */
  async function handleCreate() {
    if (selectedIds.length === 0) {
      setCreateError("Select at least one employee to include in this payrun")
      return
    }

    setIsCreating(true)
    setCreateError("")

    try {
      const payrun = await apiRequest<{ id: string }>("/api/payruns", {
        method: "POST",
        body: JSON.stringify({
          name:
            scope.name.trim() ||
            `${periodLabel(scope.periodStart)} Payroll`,
          periodStart: scope.periodStart,
          periodEnd: scope.periodEnd,
          salaryStructureId: selectedStructureId,
          employeeIds: selectedIds,
        }),
      })

      await queryClient.invalidateQueries({ queryKey: ["payroll"] })
      router.push(`/payroll/payruns/${payrun.id}`)
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Could not create the payrun",
      )
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-3">
        {[
          { number: 1 as const, label: "Define scope" },
          { number: 2 as const, label: "Select employees" },
        ].map((item, index) => {
          const isActive = step === item.number
          const isDone = step > item.number

          return (
            <div key={item.number} className="flex items-center gap-3">
              {index > 0 && <div className="h-px w-8 bg-zinc-300" />}
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold ${
                    isActive
                      ? "border-black bg-black text-white"
                      : isDone
                        ? "border-black bg-white text-black"
                        : "border-zinc-300 bg-white text-zinc-400"
                  }`}
                >
                  {isDone ? <Check className="h-3 w-3" /> : item.number}
                </div>
                <span
                  className={`text-xs font-semibold ${
                    isActive ? "text-black" : "text-zinc-500"
                  }`}
                >
                  {item.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {step === 1 ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-black">
              Payrun name
            </label>
            <Input
              value={scope.name}
              onChange={(event) =>
                setScope((current) => ({ ...current, name: event.target.value }))
              }
              placeholder={`${periodLabel(scope.periodStart)} Payroll`}
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              Leave blank to name it after the period.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-black">
              Salary structure <span className="text-zinc-400">*</span>
            </label>
            <Select
              value={selectedStructureId}
              onChange={(event) =>
                setScope((current) => ({
                  ...current,
                  salaryStructureId: event.target.value,
                }))
              }
            >
              <option value="">Select a structure</option>
              {structures.map((structure) => (
                <option key={structure.id} value={structure.id}>
                  {structure.name} ({structure.code})
                </option>
              ))}
            </Select>
            {structures.length === 0 && (
              <p className="mt-1 text-[11px] font-medium text-black">
                No salary structure found. Create one in Salary Structures first.
              </p>
            )}
            {errors.salaryStructureId && (
              <p className="mt-1 text-[11px] font-medium text-black">
                {errors.salaryStructureId}
              </p>
            )}
            <p className="mt-1 text-[11px] text-zinc-500">
              The structure decides which salary rules compute each payslip.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-black">
                Period start <span className="text-zinc-400">*</span>
              </label>
              <Input
                type="date"
                value={scope.periodStart}
                onChange={(event) =>
                  setScope((current) => ({
                    ...current,
                    periodStart: event.target.value,
                  }))
                }
              />
              {errors.periodStart && (
                <p className="mt-1 text-[11px] font-medium text-black">
                  {errors.periodStart}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-black">
                Period end <span className="text-zinc-400">*</span>
              </label>
              <Input
                type="date"
                value={scope.periodEnd}
                onChange={(event) =>
                  setScope((current) => ({
                    ...current,
                    periodEnd: event.target.value,
                  }))
                }
              />
              {errors.periodEnd && (
                <p className="mt-1 text-[11px] font-medium text-black">
                  {errors.periodEnd}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-black">
              Department
            </label>
            <Select
              value={scope.departmentId}
              onChange={(event) =>
                setScope((current) => ({
                  ...current,
                  departmentId: event.target.value,
                }))
              }
            >
              <option value="">All departments</option>
              {(departmentsQuery.data ?? []).map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[11px] text-zinc-500">
              Narrows the employee list on the next step.
            </p>
          </div>

          <div className="flex justify-end gap-2 border-t border-zinc-200 pt-4">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleContinue}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div className="grid gap-2 text-xs sm:grid-cols-3">
              <div>
                <span className="text-zinc-500">Structure</span>
                <p className="font-semibold text-black">{structureName}</p>
              </div>
              <div>
                <span className="text-zinc-500">Period</span>
                <p className="font-semibold text-black">
                  {scope.periodStart} → {scope.periodEnd}
                </p>
              </div>
              <div>
                <span className="text-zinc-500">Selected</span>
                <p className="font-semibold text-black">
                  {selectedIds.length} of {selectable.length} eligible
                </p>
              </div>
            </div>
          </div>

          {eligibleQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking eligible employees...
            </div>
          ) : eligibleQuery.isError ? (
            <div className="rounded-lg border border-zinc-300 bg-white p-6 text-center text-sm text-zinc-600">
              Could not load eligible employees.
            </div>
          ) : employees.length === 0 ? (
            <div className="rounded-lg border border-zinc-300 bg-white p-8 text-center">
              <Users className="mx-auto h-6 w-6 text-zinc-400" />
              <p className="mt-2 text-sm font-semibold text-black">
                No employees match this scope
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Try a different department or period.
              </p>
            </div>
          ) : (
            <div className="max-h-[340px] overflow-auto rounded-lg border border-zinc-300">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50">
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        aria-label="Select all eligible employees"
                        className="h-4 w-4 accent-black"
                        checked={
                          selectable.length > 0 &&
                          selectedIds.length === selectable.length
                        }
                        onChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead className="font-semibold text-black">
                      Employee
                    </TableHead>
                    <TableHead className="font-semibold text-black">
                      Department
                    </TableHead>
                    <TableHead className="font-semibold text-black">
                      Wage
                    </TableHead>
                    <TableHead className="font-semibold text-black">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => {
                    const isSelected = selectedIds.includes(employee.id)

                    return (
                      <TableRow
                        key={employee.id}
                        className={`border-zinc-200 ${
                          employee.eligible
                            ? "cursor-pointer hover:bg-zinc-50"
                            : "bg-zinc-50/60 opacity-70"
                        }`}
                        onClick={() =>
                          employee.eligible && toggleEmployee(employee.id)
                        }
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-black"
                            aria-label={`Select ${employee.employeeName}`}
                            disabled={!employee.eligible}
                            checked={isSelected}
                            onChange={() => toggleEmployee(employee.id)}
                            onClick={(event) => event.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-black">
                            {employee.employeeName}
                          </div>
                          <div className="font-mono text-[11px] text-zinc-500">
                            {employee.employeeCode} · {employee.jobTitle}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-zinc-700">
                          {employee.department ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-black">
                          {employee.monthlyWage
                            ? formatINR(Number(employee.monthlyWage))
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {employee.issues.length === 0 ? (
                            <Badge variant="active">Ready</Badge>
                          ) : (
                            <div className="space-y-1">
                              {employee.issues.map((issue) => (
                                <div
                                  key={issue}
                                  className="flex items-center gap-1 text-[11px] text-zinc-600"
                                >
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  {issue}
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs">
              <span className="text-zinc-600">
                {selectedIds.length} employee{selectedIds.length === 1 ? "" : "s"}{" "}
                selected
              </span>
              <span className="font-semibold text-black">
                Combined monthly wage {formatINR(selectedTotal)}
              </span>
            </div>
          )}

          {createError && (
            <div className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-medium text-black">
              {createError}
            </div>
          )}

          <div className="flex justify-between gap-2 border-t border-zinc-200 pt-4">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isCreating || selectedIds.length === 0}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>Create Payrun</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
