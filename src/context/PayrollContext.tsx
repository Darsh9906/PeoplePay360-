"use client"

import React, { createContext, useContext, useState } from "react"

export interface PayrunRecord {
  id: string
  name: string
  period: string
  salaryStructure: string
  employeeCount: number
  totalAmount: number
  status: "Draft" | "Computed" | "Validated" | "Paid"
  createdAt: string
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

interface PayrollContextType {
  payruns: PayrunRecord[]
  payslips: PayslipRecord[]
  structures: SalaryStructureRecord[]
  rules: SalaryRuleRecord[]
  anomalies: PayrollAnomalyRecord[]
  addPayrun: (payrun: Omit<PayrunRecord, "id" | "createdAt" | "totalAmount" | "status">) => PayrunRecord
  updatePayrunStatus: (id: string, newStatus: PayrunRecord["status"]) => void
  getPayrunById: (id: string) => PayrunRecord | undefined
  getPayslipById: (id: string) => PayslipRecord | undefined
  addSalaryStructure: (structure: Omit<SalaryStructureRecord, "id" | "ruleCount">) => SalaryStructureRecord
  addSalaryRule: (rule: Omit<SalaryRuleRecord, "id">) => SalaryRuleRecord
  getStructureById: (id: string) => SalaryStructureRecord | undefined
  getRuleById: (id: string) => SalaryRuleRecord | undefined
  resolveAnomaly: (id: string) => void
}

const PayrollContext = createContext<PayrollContextType | null>(null)

// Initial state is strictly empty — NO dummy or fake records
const INITIAL_PAYRUNS: PayrunRecord[] = []
const INITIAL_PAYSLIPS: PayslipRecord[] = []
const INITIAL_STRUCTURES: SalaryStructureRecord[] = []
const INITIAL_RULES: SalaryRuleRecord[] = []
const INITIAL_ANOMALIES: PayrollAnomalyRecord[] = []

export function PayrollProvider({ children }: { children: React.ReactNode }) {
  const [payruns, setPayruns] = useState<PayrunRecord[]>(INITIAL_PAYRUNS)
  const [payslips] = useState<PayslipRecord[]>(INITIAL_PAYSLIPS)
  const [structures, setStructures] = useState<SalaryStructureRecord[]>(INITIAL_STRUCTURES)
  const [rules, setRules] = useState<SalaryRuleRecord[]>(INITIAL_RULES)
  const [anomalies, setAnomalies] = useState<PayrollAnomalyRecord[]>(INITIAL_ANOMALIES)

  const addPayrun = (
    data: Omit<PayrunRecord, "id" | "createdAt" | "totalAmount" | "status">
  ): PayrunRecord => {
    const newId = `PR-${String(payruns.length + 1).padStart(3, "0")}`
    const newPayrun: PayrunRecord = {
      ...data,
      id: newId,
      status: "Draft",
      totalAmount: 0,
      createdAt: new Date().toISOString().split("T")[0],
      employees: [],
    }
    setPayruns((prev) => [newPayrun, ...prev])
    return newPayrun
  }

  const updatePayrunStatus = (id: string, newStatus: PayrunRecord["status"]) => {
    setPayruns((prev) =>
      prev.map((pr) => {
        if (pr.id !== id) return pr
        return {
          ...pr,
          status: newStatus,
        }
      })
    )
  }

  const addSalaryStructure = (
    data: Omit<SalaryStructureRecord, "id" | "ruleCount">
  ): SalaryStructureRecord => {
    const newId = `STR-${String(structures.length + 1).padStart(3, "0")}`
    const newStruct: SalaryStructureRecord = {
      ...data,
      id: newId,
      ruleCount: 0,
      rules: [],
    }
    setStructures((prev) => [newStruct, ...prev])
    return newStruct
  }

  const addSalaryRule = (data: Omit<SalaryRuleRecord, "id">): SalaryRuleRecord => {
    const newId = `RUL-${String(rules.length + 1).padStart(3, "0")}`
    const newRule: SalaryRuleRecord = {
      ...data,
      id: newId,
    }
    setRules((prev) => [newRule, ...prev])
    setStructures((prev) =>
      prev.map((s) =>
        s.id === data.structureId
          ? { ...s, ruleCount: s.ruleCount + 1, rules: [...(s.rules || []), newRule] }
          : s
      )
    )
    return newRule
  }

  const resolveAnomaly = (id: string) => {
    setAnomalies((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "Resolved" } : a))
    )
  }

  const getPayrunById = (id: string) => payruns.find((pr) => pr.id === id)
  const getPayslipById = (id: string) => payslips.find((ps) => ps.id === id)
  const getStructureById = (id: string) => structures.find((s) => s.id === id)
  const getRuleById = (id: string) => rules.find((r) => r.id === id)

  return (
    <PayrollContext.Provider
      value={{
        payruns,
        payslips,
        structures,
        rules,
        anomalies,
        addPayrun,
        updatePayrunStatus,
        getPayrunById,
        getPayslipById,
        addSalaryStructure,
        addSalaryRule,
        getStructureById,
        getRuleById,
        resolveAnomaly,
      }}
    >
      {children}
    </PayrollContext.Provider>
  )
}

export function usePayroll() {
  const context = useContext(PayrollContext)
  if (!context) {
    return {
      payruns: [],
      payslips: [],
      structures: [],
      rules: [],
      anomalies: [],
      addPayrun: () => ({
        id: "",
        name: "",
        period: "",
        salaryStructure: "",
        employeeCount: 0,
        totalAmount: 0,
        status: "Draft" as const,
        createdAt: "",
      }),
      updatePayrunStatus: () => {},
      getPayrunById: () => undefined,
      getPayslipById: () => undefined,
      addSalaryStructure: () => ({
        id: "",
        name: "",
        code: "",
        ruleCount: 0,
        status: "Active" as const,
      }),
      addSalaryRule: () => ({
        id: "",
        name: "",
        code: "",
        sequence: 1,
        category: "Basic" as const,
        calculationType: "Fixed Amount" as const,
        structureId: "",
        structureName: "",
        status: "Active" as const,
      }),
      getStructureById: () => undefined,
      getRuleById: () => undefined,
      resolveAnomaly: () => {},
    }
  }
  return context
}
