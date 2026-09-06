"use client"

import React, { createContext, useCallback, useContext, useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/src/lib/api"

export interface PayrunRecord {
  id: string
  name: string
  period: string
  salaryStructure: string
  employeeCount: number
  totalAmount: number
  status: "Draft" | "Computed" | "Validated" | "Paid"
  createdAt: string
  periodStart?: string
  periodEnd?: string
  salaryStructureId?: string | null
  employees?: Array<{
    id: string
    name: string
    department: string
    basicSalary: number
    allowances: number
    deductions: number
    netSalary: number
  }>
}

export interface PayslipRecord {
  id: string
  employeeId: string
  employeeName: string
  department: string
  payrunId: string
  payrunName: string
  payPeriod: string
  salaryStructure: string
  contractType: string
  workedDays: number
  leaveDays: number
  basicSalary: number
  allowances: number
  grossSalary: number
  deductions: number
  netSalary: number
  status: "Draft" | "Generated" | "Paid"
  issuedDate: string
}

export interface SalaryRuleRecord {
  id: string
  name: string
  code: string
  sequence: number
  category: "Basic" | "Allowance" | "Gross" | "Deduction" | "Net"
  calculationType: "Percentage" | "Fixed Amount" | "Formula"
  structureId: string
  structureName: string
  amountOrPercentage?: string
  /** Code the percentage is taken from (WAGE, BASIC, GROSS, or any earlier rule). */
  percentageBaseCode?: string | null
  description?: string
  status: "Active" | "Inactive"
}

export interface SalaryStructureRecord {
  id: string
  name: string
  code: string
  ruleCount: number
  status: "Active" | "Inactive"
  department?: string
  description?: string
  rules?: SalaryRuleRecord[]
}

export interface PayrollAnomalyRecord {
  id: string
  issue: string
  employeeName?: string
  employeeId?: string
  category:
    | "Missing Employee Information"
    | "Missing Bank/Payment Details"
    | "Contract Issue"
    | "Salary Structure Issue"
    | "Salary Rule Issue"
    | "Attendance Issue"
    | "Duplicate Payslip"
    | "Duplicate Payrun"
    | "Payroll Validation Issue"
    | "Other Payroll Warning"
  severity: "Critical" | "Warning" | "Info"
  payrunId?: string
  payslipId?: string
  status: "Pending" | "Resolved"
  date: string
  description: string
}

type PayrunCreateInput = {
  name: string
  periodStart: string
  periodEnd: string
  salaryStructureId?: string
  employeeIds?: string[]
}

interface PayrollContextType {
  payruns: PayrunRecord[]
  payslips: PayslipRecord[]
  structures: SalaryStructureRecord[]
  rules: SalaryRuleRecord[]
  anomalies: PayrollAnomalyRecord[]
  isLoading: boolean
  addPayrun: (payrun: PayrunCreateInput) => Promise<PayrunRecord>
  updatePayrunStatus: (id: string, newStatus: PayrunRecord["status"]) => Promise<void>
  getPayrunById: (id: string) => PayrunRecord | undefined
  getPayslipById: (id: string) => PayslipRecord | undefined
  addSalaryStructure: (structure: Omit<SalaryStructureRecord, "id" | "ruleCount">) => Promise<SalaryStructureRecord>
  addSalaryRule: (rule: Omit<SalaryRuleRecord, "id">) => Promise<SalaryRuleRecord>
  getStructureById: (id: string) => SalaryStructureRecord | undefined
  getRuleById: (id: string) => SalaryRuleRecord | undefined
  resolveAnomaly: (id: string) => void
}

type BackendRule = {
  id: string
  structureId: string
  name: string
  code: string
  category: "basic" | "allowance" | "earning" | "gross" | "deduction" | "net"
  sequence: number
  amount: string | number
  percentageBaseCode?: string | null
}

type BackendStructure = {
  id: string
  name: string
  code: string
  isActive: boolean
  rules?: BackendRule[]
}

type BackendPayrun = {
  id: string
  name: string
  periodStart: string
  periodEnd: string
  status: "draft" | "computed" | "validated" | "paid"
  salaryStructureId?: string | null
  salaryStructure?: BackendStructure | null
  employeeCount?: number
  createdAt?: string | Date
}

type BackendPayslip = {
  id: string
  payrunId: string
  payrunName: string
  employeeId: string
  employeeCode?: string
  employeeName: string
  department?: string | null
  periodStart?: string
  periodEnd?: string
  workedDays: string | number
  leaveDays: string | number
  grossPay: string | number
  totalDeductions: string | number
  netPay: string | number
  status: "draft" | "generated" | "paid"
}

type BackendWarning = {
  id: string
  payrunId?: string | null
  employeeId?: string | null
  employeeCode?: string | null
  employeeName?: string | null
  code: string
  message: string
}

const PayrollContext = createContext<PayrollContextType | null>(null)

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatPeriod(start?: string, end?: string) {
  if (!start || !end) return "Period not set"
  return `${start} - ${end}`
}

function formatDate(value?: string | Date) {
  if (!value) return new Date().toISOString().split("T")[0]
  return new Date(value).toISOString().split("T")[0]
}

function mapPayrunStatus(status: BackendPayrun["status"]): PayrunRecord["status"] {
  if (status === "paid") return "Paid"
  if (status === "validated") return "Validated"
  if (status === "computed") return "Computed"
  return "Draft"
}

function mapPayslipStatus(status: BackendPayslip["status"]): PayslipRecord["status"] {
  if (status === "paid") return "Paid"
  if (status === "generated") return "Generated"
  return "Draft"
}

function mapRuleCategory(rule: BackendRule): SalaryRuleRecord["category"] {
  if (rule.category === "basic") return "Basic"
  if (rule.category === "allowance") return "Allowance"
  if (rule.category === "gross") return "Gross"
  if (rule.category === "deduction") return "Deduction"
  if (rule.category === "net") return "Net"
  // Legacy rows stored before the categories were split out.
  return rule.code.toUpperCase() === "BASIC" ? "Basic" : "Allowance"
}

function toBackendRuleCategory(category: SalaryRuleRecord["category"]) {
  if (category === "Basic") return "basic"
  if (category === "Allowance") return "allowance"
  if (category === "Gross") return "gross"
  if (category === "Deduction") return "deduction"
  return "net"
}

function mapWarningCategory(code: string): PayrollAnomalyRecord["category"] {
  const normalized = code.toLowerCase()
  if (normalized.includes("bank") || normalized.includes("payment")) return "Missing Bank/Payment Details"
  if (normalized.includes("contract")) return "Contract Issue"
  if (normalized.includes("attendance")) return "Attendance Issue"
  if (normalized.includes("rule")) return "Salary Rule Issue"
  if (normalized.includes("structure")) return "Salary Structure Issue"
  if (normalized.includes("duplicate")) return "Duplicate Payslip"
  if (normalized.includes("employee")) return "Missing Employee Information"
  return "Other Payroll Warning"
}

function mapWarningSeverity(code: string): PayrollAnomalyRecord["severity"] {
  const normalized = code.toLowerCase()
  if (normalized.includes("missing") || normalized.includes("error")) return "Critical"
  if (normalized.includes("info")) return "Info"
  return "Warning"
}

function mapRule(rule: BackendRule, structureName = "General"): SalaryRuleRecord {
  const amount = toNumber(rule.amount)
  const isPercentage = Boolean(rule.percentageBaseCode)
  return {
    id: rule.id,
    name: rule.name,
    code: rule.code,
    sequence: Number(rule.sequence) || 1,
    category: mapRuleCategory(rule),
    calculationType: isPercentage ? "Percentage" : "Fixed Amount",
    structureId: rule.structureId,
    structureName,
    amountOrPercentage: isPercentage ? `${amount}% of ${rule.percentageBaseCode}` : String(amount),
    percentageBaseCode: rule.percentageBaseCode ?? null,
    description: "",
    status: "Active",
  }
}

function mapStructure(structure: BackendStructure, rules: SalaryRuleRecord[] = []): SalaryStructureRecord {
  const mappedRules = rules.filter((rule) => rule.structureId === structure.id)
  return {
    id: structure.id,
    name: structure.name,
    code: structure.code,
    ruleCount: structure.rules?.length ?? mappedRules.length,
    status: structure.isActive ? "Active" : "Inactive",
    description: "",
    rules: structure.rules?.map((rule) => mapRule(rule, structure.name)) ?? mappedRules,
  }
}

export function PayrollProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()

  const payrunsQuery = useQuery({
    queryKey: ["payroll", "payruns"],
    queryFn: () => apiRequest<BackendPayrun[]>("/api/payruns"),
  })
  const payslipsQuery = useQuery({
    queryKey: ["payroll", "payslips"],
    queryFn: () => apiRequest<BackendPayslip[]>("/api/payslips"),
  })
  const structuresQuery = useQuery({
    queryKey: ["payroll", "structures"],
    queryFn: () => apiRequest<BackendStructure[]>("/api/salary-structures"),
  })
  const rulesQuery = useQuery({
    queryKey: ["payroll", "rules"],
    queryFn: () => apiRequest<BackendRule[]>("/api/salary-rules"),
  })
  const warningsQuery = useQuery({
    queryKey: ["payroll", "warnings"],
    queryFn: () => apiRequest<BackendWarning[]>("/api/payroll-warnings"),
  })

  const structureNameById = useMemo(() => {
    return new Map((structuresQuery.data ?? []).map((structure) => [structure.id, structure.name]))
  }, [structuresQuery.data])

  const rules = useMemo(
    () =>
      (rulesQuery.data ?? []).map((rule) =>
        mapRule(rule, structureNameById.get(rule.structureId) ?? "General")
      ),
    [rulesQuery.data, structureNameById]
  )

  const structures = useMemo(
    () => (structuresQuery.data ?? []).map((structure) => mapStructure(structure, rules)),
    [rules, structuresQuery.data]
  )

  const payslipByPayrun = useMemo(() => {
    const grouped = new Map<string, PayslipRecord[]>()
    ;(payslipsQuery.data ?? []).forEach((payslip) => {
      const mapped: PayslipRecord = {
        id: payslip.id,
        employeeId: payslip.employeeCode ?? payslip.employeeId,
        employeeName: payslip.employeeName,
        department: payslip.department ?? "Unassigned",
        payrunId: payslip.payrunId,
        payrunName: payslip.payrunName,
        payPeriod: formatPeriod(payslip.periodStart, payslip.periodEnd),
        salaryStructure: "Default",
        contractType: "—",
        workedDays: toNumber(payslip.workedDays),
        leaveDays: toNumber(payslip.leaveDays),
        basicSalary: toNumber(payslip.grossPay),
        allowances: 0,
        grossSalary: toNumber(payslip.grossPay),
        deductions: toNumber(payslip.totalDeductions),
        netSalary: toNumber(payslip.netPay),
        status: mapPayslipStatus(payslip.status),
        issuedDate: new Date().toISOString().split("T")[0],
      }
      const existing = grouped.get(payslip.payrunId) ?? []
      grouped.set(payslip.payrunId, [...existing, mapped])
    })
    return grouped
  }, [payslipsQuery.data])

  const payruns = useMemo(
    () =>
      (payrunsQuery.data ?? []).map((payrun) => {
        const payrunPayslips = payslipByPayrun.get(payrun.id) ?? []
        const totalAmount = payrunPayslips.reduce((sum, payslip) => sum + payslip.netSalary, 0)
        const salaryStructure =
          payrun.salaryStructure?.name ??
          structureNameById.get(payrun.salaryStructureId ?? "") ??
          "Default"

        return {
          id: payrun.id,
          name: payrun.name,
          period: formatPeriod(payrun.periodStart, payrun.periodEnd),
          periodStart: payrun.periodStart,
          periodEnd: payrun.periodEnd,
          salaryStructureId: payrun.salaryStructureId,
          salaryStructure,
          employeeCount: payrun.employeeCount ?? payrunPayslips.length,
          totalAmount,
          status: mapPayrunStatus(payrun.status),
          createdAt: formatDate(payrun.createdAt),
          employees: payrunPayslips.map((payslip) => ({
            id: payslip.employeeId,
            name: payslip.employeeName,
            department: payslip.department,
            basicSalary: payslip.basicSalary,
            allowances: payslip.allowances,
            deductions: payslip.deductions,
            netSalary: payslip.netSalary,
          })),
        } satisfies PayrunRecord
      }),
    [payrunsQuery.data, payslipByPayrun, structureNameById]
  )

  const payrunById = useMemo(() => new Map(payruns.map((payrun) => [payrun.id, payrun])), [payruns])

  const payslips = useMemo(
    () =>
      (payslipsQuery.data ?? []).map((payslip) => {
        const payrun = payrunById.get(payslip.payrunId)
        return {
          id: payslip.id,
          employeeId: payslip.employeeCode ?? payslip.employeeId,
          employeeName: payslip.employeeName,
          department: payslip.department ?? "Unassigned",
          payrunId: payslip.payrunId,
          payrunName: payslip.payrunName,
          payPeriod: payrun?.period ?? formatPeriod(payslip.periodStart, payslip.periodEnd),
          salaryStructure: payrun?.salaryStructure ?? "Default",
          contractType: payrun?.salaryStructure ?? "—",
          workedDays: toNumber(payslip.workedDays),
          leaveDays: toNumber(payslip.leaveDays),
          basicSalary: toNumber(payslip.grossPay),
          allowances: 0,
          grossSalary: toNumber(payslip.grossPay),
          deductions: toNumber(payslip.totalDeductions),
          netSalary: toNumber(payslip.netPay),
          status: mapPayslipStatus(payslip.status),
          issuedDate: new Date().toISOString().split("T")[0],
        } satisfies PayslipRecord
      }),
    [payrunById, payslipsQuery.data]
  )

  const anomalies = useMemo(
    () =>
      (warningsQuery.data ?? []).map((warning) => ({
        id: warning.id,
        issue: warning.code,
        employeeName: warning.employeeName ?? undefined,
        employeeId: warning.employeeCode ?? warning.employeeId ?? undefined,
        category: mapWarningCategory(warning.code),
        severity: mapWarningSeverity(warning.code),
        payrunId: warning.payrunId ?? undefined,
        status: "Pending",
        date: new Date().toISOString().split("T")[0],
        description: warning.message,
      } satisfies PayrollAnomalyRecord)),
    [warningsQuery.data]
  )

  const invalidatePayroll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["payroll", "payruns"] }),
      queryClient.invalidateQueries({ queryKey: ["payroll", "payslips"] }),
      queryClient.invalidateQueries({ queryKey: ["payroll", "structures"] }),
      queryClient.invalidateQueries({ queryKey: ["payroll", "rules"] }),
      queryClient.invalidateQueries({ queryKey: ["payroll", "warnings"] }),
    ])
  }

  const addPayrunMutation = useMutation({
    mutationFn: (data: PayrunCreateInput) =>
      apiRequest<BackendPayrun>("/api/payruns", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: invalidatePayroll,
  })

  const updatePayrunStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PayrunRecord["status"] }) => {
      const action =
        status === "Computed"
          ? "compute"
          : status === "Validated"
            ? "validate"
            : status === "Paid"
              ? "mark-paid"
              : null

      if (!action) return
      await apiRequest(`/api/payruns/${id}/${action}`, { method: "POST" })
    },
    onSuccess: invalidatePayroll,
  })

  const addStructureMutation = useMutation({
    mutationFn: (structure: Omit<SalaryStructureRecord, "id" | "ruleCount">) =>
      apiRequest<BackendStructure>("/api/salary-structures", {
        method: "POST",
        body: JSON.stringify({
          name: structure.name,
          code: structure.code,
          isActive: structure.status === "Active",
        }),
      }),
    onSuccess: invalidatePayroll,
  })

  const addRuleMutation = useMutation({
    mutationFn: (rule: Omit<SalaryRuleRecord, "id">) =>
      apiRequest<BackendRule>("/api/salary-rules", {
        method: "POST",
        body: JSON.stringify({
          structureId: rule.structureId,
          name: rule.name,
          code: rule.code,
          category: toBackendRuleCategory(rule.category),
          sequence: rule.sequence,
          amount: toNumber(rule.amountOrPercentage),
          percentageBaseCode:
            rule.calculationType === "Percentage"
              ? (rule.percentageBaseCode || "WAGE")
              : null,
        }),
      }),
    onSuccess: invalidatePayroll,
  })

  const addPayrun = useCallback(async (data: PayrunCreateInput) => {
    const payrun = await addPayrunMutation.mutateAsync(data)
    return {
      id: payrun.id,
      name: payrun.name,
      period: formatPeriod(payrun.periodStart, payrun.periodEnd),
      periodStart: payrun.periodStart,
      periodEnd: payrun.periodEnd,
      salaryStructureId: payrun.salaryStructureId,
      salaryStructure: structureNameById.get(payrun.salaryStructureId ?? "") ?? "Default",
      employeeCount: 0,
      totalAmount: 0,
      status: mapPayrunStatus(payrun.status),
      createdAt: formatDate(payrun.createdAt),
      employees: [],
    }
  }, [addPayrunMutation, structureNameById])

  const updatePayrunStatus = useCallback(async (id: string, newStatus: PayrunRecord["status"]) => {
    await updatePayrunStatusMutation.mutateAsync({ id, status: newStatus })
  }, [updatePayrunStatusMutation])

  const addSalaryStructure = useCallback(async (data: Omit<SalaryStructureRecord, "id" | "ruleCount">) => {
    const structure = await addStructureMutation.mutateAsync(data)
    return mapStructure(structure, rules)
  }, [addStructureMutation, rules])

  const addSalaryRule = useCallback(async (data: Omit<SalaryRuleRecord, "id">) => {
    const rule = await addRuleMutation.mutateAsync(data)
    return mapRule(rule, data.structureName)
  }, [addRuleMutation])

  const resolveAnomaly = useCallback((id: string) => {
    queryClient.setQueryData<BackendWarning[]>(["payroll", "warnings"], (current) =>
      (current ?? []).filter((warning) => warning.id !== id)
    )
  }, [queryClient])

  const value = useMemo(
    () => ({
      payruns,
      payslips,
      structures,
      rules,
      anomalies,
      isLoading:
        payrunsQuery.isLoading ||
        payslipsQuery.isLoading ||
        structuresQuery.isLoading ||
        rulesQuery.isLoading ||
        warningsQuery.isLoading,
      addPayrun,
      updatePayrunStatus,
      getPayrunById: (id: string) => payruns.find((payrun) => payrun.id === id),
      getPayslipById: (id: string) => payslips.find((payslip) => payslip.id === id),
      addSalaryStructure,
      addSalaryRule,
      getStructureById: (id: string) => structures.find((structure) => structure.id === id),
      getRuleById: (id: string) => rules.find((rule) => rule.id === id),
      resolveAnomaly,
    }),
    [
      payruns,
      payslips,
      structures,
      rules,
      anomalies,
      payrunsQuery.isLoading,
      payslipsQuery.isLoading,
      structuresQuery.isLoading,
      rulesQuery.isLoading,
      warningsQuery.isLoading,
      addPayrun,
      updatePayrunStatus,
      addSalaryStructure,
      addSalaryRule,
      resolveAnomaly,
    ],
  )

  return <PayrollContext.Provider value={value}>{children}</PayrollContext.Provider>
}

export function usePayroll() {
  const context = useContext(PayrollContext)
  if (!context) {
    throw new Error("usePayroll must be used inside PayrollProvider")
  }
  return context
}
