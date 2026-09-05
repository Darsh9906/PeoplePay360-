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

interface PayrollContextType {
  payruns: PayrunRecord[]
  payslips: PayslipRecord[]
  addPayrun: (payrun: Omit<PayrunRecord, "id" | "createdAt" | "totalAmount" | "status">) => PayrunRecord
  updatePayrunStatus: (id: string, newStatus: PayrunRecord["status"]) => void
  getPayrunById: (id: string) => PayrunRecord | undefined
  getPayslipById: (id: string) => PayslipRecord | undefined
}

const PayrollContext = createContext<PayrollContextType | null>(null)

// Initial state is strictly empty — NO dummy or fake records
const INITIAL_PAYRUNS: PayrunRecord[] = []
const INITIAL_PAYSLIPS: PayslipRecord[] = []

export function PayrollProvider({ children }: { children: React.ReactNode }) {
  const [payruns, setPayruns] = useState<PayrunRecord[]>(INITIAL_PAYRUNS)
  const [payslips, setPayslips] = useState<PayslipRecord[]>(INITIAL_PAYSLIPS)

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

  const getPayrunById = (id: string) => {
    return payruns.find((pr) => pr.id === id)
  }

  const getPayslipById = (id: string) => {
    return payslips.find((ps) => ps.id === id)
  }

  return (
    <PayrollContext.Provider
      value={{
        payruns,
        payslips,
        addPayrun,
        updatePayrunStatus,
        getPayrunById,
        getPayslipById,
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
    }
  }
  return context
}
