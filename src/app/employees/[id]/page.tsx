import { Suspense } from "react"
import Employee360 from "@/src/pages/employees/details/Employee360"

export default function EmployeeDetailsPage() {
  return (
    <Suspense fallback={<main className="p-6 text-sm text-zinc-500">Loading employee profile...</main>}>
      <Employee360 />
    </Suspense>
  )
}
