/** Shared view-model shapes for the HR modules. */

export type EmployeeStatus = "Active" | "Inactive" | "On Leave"

export interface Employee {
  id: string
  employeeCode?: string
  firstName: string
  lastName: string
  email: string
  department: string
  position: string
  status: EmployeeStatus
  hireDate?: string
  managerName?: string | null
  scheduleName?: string | null
}

export type ContractStatus =
  | "Running"
  | "Active"
  | "Expiring"
  | "Expired"
  | "Draft"
  | "Pending"

export interface Contract {
  id: string
  employeeId: string
  employeeName: string
  contractType: string
  salary: number
  startDate: string
  endDate: string
  workingSchedule: string
  status: ContractStatus
}
