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

interface PayrollContextType {
  payruns: PayrunRecord[]
  addPayrun: (payrun: Omit<PayrunRecord, "id" | "createdAt" | "totalAmount" | "status">) => PayrunRecord
  updatePayrunStatus: (id: string, newStatus: PayrunRecord["status"]) => void
  getPayrunById: (id: string) => PayrunRecord | undefined
}

const PayrollContext = createContext<PayrollContextType | null>(null)

// Initial payruns state is strictly empty — NO dummy or fake records
const INITIAL_PAYRUNS: PayrunRecord[] = []

export function PayrollProvider({ children }: { children: React.ReactNode }) {
  const [payruns, setPayruns] = useState<PayrunRecord[]>(INITIAL_PAYRUNS)

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

  return (
    <PayrollContext.Provider
      value={{
        payruns,
        addPayrun,
        updatePayrunStatus,
        getPayrunById,
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
    }
  }
  return context
}
