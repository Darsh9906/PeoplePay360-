"use client"

import { useMemo } from "react"
import Link from "next/link"
import { usePayroll } from "@/src/context/PayrollContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { ArrowLeft, ListChecks, XCircle } from "lucide-react"

interface StructureDetailsProps {
  id?: string
}

export default function SalaryStructureDetails({ id }: StructureDetailsProps) {
  const { structures, rules, getStructureById } = usePayroll()

  const structure = useMemo(() => {
    if (!id) return structures[0]
    return getStructureById(id) || structures.find((s) => s.id === id) || structures[0]
  }, [id, structures, getStructureById])

  const associatedRules = useMemo(() => {
    if (!structure) return []
    return rules.filter((r) => r.structureId === structure.id)
  }, [rules, structure])

  if (!structure) {
    return (
      <div className="space-y-6 py-12 text-center">
        <XCircle className="h-12 w-12 text-zinc-300 mx-auto" />
        <h2 className="text-lg font-bold text-black">Salary Structure Not Found</h2>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
          The requested salary structure ID does not exist or has been removed.
        </p>
        <Link href="/payroll/structures">
          <Button size="sm" className="bg-black hover:bg-zinc-800 text-white border border-black">
            Return to Salary Structures
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/payroll/structures" className="flex items-center gap-1 text-zinc-600 hover:text-black transition">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Structures
        </Link>
        <span>/</span>
        <span className="text-black font-semibold">{structure.id}</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-black">
              {structure.name}
            </h1>
            <Badge variant={structure.status === "Active" ? "active" : "inactive"}>
              {structure.status}
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Code: <span className="font-mono font-bold text-black">{structure.code}</span> &bull; Department:{" "}
            <span className="font-semibold text-black">{structure.department || "General"}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/payroll/rules">
            <Button className="bg-black hover:bg-zinc-800 text-white text-xs gap-1 border border-black">
              <ListChecks className="h-3.5 w-3.5" />
              Manage Salary Rules
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-zinc-300 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Structure Code
          </div>
          <div className="text-xl font-bold text-black font-mono">{structure.code}</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-zinc-300 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Associated Rules
          </div>
          <div className="text-xl font-bold text-black">
            {associatedRules.length} rule(s)
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-zinc-300 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Status
          </div>
          <div className="text-xl font-bold text-black">{structure.status}</div>
        </div>
      </div>

      {/* Associated Salary Rules Ordered Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-black">
            Associated Salary Rules (Sequence Order)
          </h2>
          <Link href="/payroll/rules" className="text-xs text-zinc-600 hover:text-black font-semibold">
            Add Rules →
          </Link>
        </div>

        <div className="rounded-xl border border-zinc-300 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-200 bg-zinc-50">
                <TableHead className="text-black font-semibold">Sequence</TableHead>
                <TableHead className="text-black font-semibold">Rule Name</TableHead>
                <TableHead className="text-black font-semibold">Code</TableHead>
                <TableHead className="text-black font-semibold">Category</TableHead>
                <TableHead className="text-black font-semibold">Calculation Type</TableHead>
                <TableHead className="text-black font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {associatedRules.length > 0 ? (
                associatedRules.map((rule) => (
                  <TableRow key={rule.id} className="border-zinc-200 hover:bg-zinc-50">
                    <TableCell className="font-mono font-bold text-black">
                      #{rule.sequence}
                    </TableCell>

                    <TableCell className="font-semibold text-black">
                      <div>
                        {rule.name}
                        <div className="text-xs text-zinc-500 font-mono font-normal">
                          {rule.id}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs font-mono font-bold text-black">
                      {rule.code}
                    </TableCell>

                    <TableCell className="text-xs font-medium text-zinc-700">
                      <span className="inline-flex items-center rounded-md bg-zinc-100 border border-zinc-300 px-2 py-0.5">
                        {rule.category}
                      </span>
                    </TableCell>

                    <TableCell className="text-xs text-zinc-700 font-medium">
                      {rule.calculationType}
                    </TableCell>

                    <TableCell>
                      <Badge variant={rule.status === "Active" ? "active" : "inactive"}>
                        {rule.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-zinc-500 space-y-2 py-6">
                      <ListChecks className="h-8 w-8 text-zinc-300" />
                      <p className="text-base font-bold text-black">
                        No associated salary rules
                      </p>
                      <p className="text-xs text-zinc-500 max-w-sm">
                        There are no salary rules attached to this structure yet. Click &quot;Manage Salary Rules&quot; to define calculation rules.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
