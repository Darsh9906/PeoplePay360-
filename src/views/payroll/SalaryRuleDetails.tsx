"use client"

import { useMemo } from "react"
import Link from "next/link"
import { usePayroll } from "@/src/context/PayrollContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Layers, XCircle } from "lucide-react"

interface RuleDetailsProps {
  id?: string
}

export default function SalaryRuleDetails({ id }: RuleDetailsProps) {
  const { rules, getRuleById } = usePayroll()

  const rule = useMemo(() => {
    if (!id) return rules[0]
    return getRuleById(id) || rules.find((r) => r.id === id) || rules[0]
  }, [id, rules, getRuleById])

  if (!rule) {
    return (
      <div className="space-y-6 py-12 text-center">
        <XCircle className="h-12 w-12 text-zinc-300 mx-auto" />
        <h2 className="text-lg font-bold text-black">Salary Rule Not Found</h2>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
          The requested salary rule ID does not exist or has been removed.
        </p>
        <Link href="/payroll/rules">
          <Button size="sm" className="bg-black hover:bg-zinc-800 text-white border border-black">
            Return to Salary Rules
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/payroll/rules" className="flex items-center gap-1 text-zinc-600 hover:text-black transition">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Salary Rules
        </Link>
        <span>/</span>
        <span className="text-black font-semibold">{rule.id}</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-black">
              {rule.name}
            </h1>
            <Badge variant={rule.status === "Active" ? "active" : "inactive"}>
              {rule.status}
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Code: <span className="font-mono font-bold text-black">{rule.code}</span> &bull; Sequence:{" "}
            <span className="font-semibold text-black">#{rule.sequence}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/payroll/structures/${rule.structureId}`}>
            <Button variant="outline" className="border-zinc-300 text-black hover:bg-zinc-100 text-xs gap-1">
              <Layers className="h-3.5 w-3.5" />
              View Structure ({rule.structureName})
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-zinc-300 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Rule Category
          </div>
          <div className="text-xl font-bold text-black">{rule.category}</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-zinc-300 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Calculation Method
          </div>
          <div className="text-xl font-bold text-black">{rule.calculationType}</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-zinc-300 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Target Structure
          </div>
          <div className="text-xl font-bold text-black">{rule.structureName}</div>
        </div>
      </div>

      {/* Detailed Parameters Container */}
      <div className="p-6 bg-white rounded-xl border border-zinc-300 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-black border-b border-zinc-200 pb-3">
          Rule Configuration Parameters
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 space-y-1">
            <span className="text-zinc-500 font-medium block">Rule Sequence Order:</span>
            <span className="font-mono font-bold text-black text-sm">#{rule.sequence}</span>
          </div>

          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 space-y-1">
            <span className="text-zinc-500 font-medium block">Computation Value / Formula:</span>
            <span className="font-mono font-bold text-black text-sm">
              {rule.amountOrPercentage || "Not defined"}
            </span>
          </div>
        </div>

        {rule.description && (
          <div className="pt-2 text-xs">
            <span className="text-zinc-500 font-medium block mb-1">Description:</span>
            <p className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-black leading-relaxed">
              {rule.description}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
