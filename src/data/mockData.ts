export interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  department: string
  position: string
  contractType: string
  status: "Active" | "Inactive" | "On Leave"
}

export interface Contract {
  id: string
  employeeId: string
  employeeName: string
  contractType: string
  salary: number
  startDate: string
  endDate: string
  workingSchedule: string
  status: "Running" | "Active" | "Expiring" | "Expired" | "Draft" | "Pending"
}

// Initial state is EMPTY — no dummy or fake records
export const INITIAL_EMPLOYEES: Employee[] = []

export const INITIAL_CONTRACTS: Contract[] = []

export const DEPARTMENTS = [
  "Engineering",
  "HR",
  "Sales",
  "Finance",
  "Marketing",
  "Operations",
]

export const CONTRACT_TYPES = ["Full-time", "Contract", "Part-time", "Internship"]

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}
