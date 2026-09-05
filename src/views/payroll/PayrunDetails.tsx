"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileText,
  Loader2,
  Mail,
  Play,
  XCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

type PayrunStatus = "draft" | "computed" | "validated" | "paid"

type PayrunPayslip = {
  id: string
  employeeId: string
  employeeCode: string
  employeeName: string
  workedDays: string
  leaveDays: string
  grossPay: string
  totalDeductions: string
  netPay: string
  status: string
}

type PayrunWarning = {
  id: string
  employeeId: string | null
  code: string
  message: string
}

type PayrunDetail = {
  id: string
  name: string
  periodStart: string
  periodEnd: string
  status: PayrunStatus
  salaryStructure: { id: string; name: string; code: string } | null
  selectedEmployees: { id: string; firstName: string; lastName: string }[]
  payslips: PayrunPayslip[]
  warnings: PayrunWarning[]
  totals: {
    grossPay: string
    totalDeductions: string
    netPay: string
    payslipCount: number
  }
}

type SendResult = {
  sent: number
  failed: number
  requested: number
  results: { employeeName: string; sent: boolean; reason?: string }[]
}

const statusOrder: PayrunStatus[] = ["draft", "computed", "validated", "paid"]

const statusLabels: Record<PayrunStatus, string> = {
  draft: "Draft",
  computed: "Computed",
  validated: "Validated",
  paid: "Paid",
}

/** Warnings that should block finalisation rather than just inform. */
const criticalCodes = new Set([
  "NO_ACTIVE_CONTRACT",
  "MISSING_BANK_DETAILS",
  "DUPLICATE_PAYSLIP",
  "NON_POSITIVE_NET",
  "CONCURRENT_CONTRACTS",
])

export default function PayrunDetails({ id }: { id?: string }) {
  const queryClient = useQueryClient()
  const [sendResult, setSendResult] = useState<SendResult | null>(null)
  const [actionError, setActionError] = useState("")

  const payrunQuery = useQuery({
    queryKey: ["payrun", id],
    enabled: Boolean(id),
    queryFn: () => apiRequest<PayrunDetail>(`/api/payruns/${id}`),
  })

  const payrun = payrunQuery.data

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["payrun", id] })
    queryClient.invalidateQueries({ queryKey: ["payroll"] })
  }

  const actionMutation = useMutation({
    mutationFn: (action: "compute" | "validate" | "mark-paid") =>
      apiRequest(`/api/payruns/${id}/${action}`, { method: "POST" }),
    onSuccess: () => {
      setActionError("")
      invalidate()
    },
    onError: (error: Error) => setActionError(error.message),
  })

  const sendMutation = useMutation({
    mutationFn: () =>
      apiRequest<SendResult>(`/api/payruns/${id}/send-payslips`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    onSuccess: (result) => {
      setActionError("")
      setSendResult(result)
      invalidate()
    },
    onError: (error: Error) => setActionError(error.message),
  })

  const criticalWarnings = useMemo(
    () => (payrun?.warnings ?? []).filter((w) => criticalCodes.has(w.code)),
    [payrun?.warnings],
  )

  if (payrunQuery.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading payrun...
      </div>
    )
  }

  if (!payrun) {
    return (
      <div className="space-y-6 py-12 text-center">
        <XCircle className="mx-auto h-12 w-12 text-zinc-300" />
        <h2 className="text-lg font-bold text-black">Payrun Not Found</h2>
        <p className="mx-auto max-w-sm text-xs text-zinc-500">
          The requested payrun does not exist or has been removed.
        </p>
        <Link href="/payroll/payruns">
          <Button size="sm">Return to Payruns</Button>
        </Link>
      </div>
    )
  }

  const currentIndex = statusOrder.indexOf(payrun.status)
  const isBusy = actionMutation.isPending || sendMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs">
        <Link
          href="/payroll/payruns"
          className="flex items-center gap-1 text-zinc-600 transition hover:text-black"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Payruns
        </Link>
        <span className="text-zinc-300">/</span>
        <span className="font-semibold text-black">{payrun.name}</span>
      </div>

      {/* Header + processing actions */}
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-black">
              {payrun.name}
            </h1>
            <Badge
              variant={
                payrun.status === "paid"
                  ? "active"
                  : payrun.status === "validated"
                    ? "running"
                    : payrun.status === "computed"
                      ? "expiring"
                      : "draft"
              }
            >
              {statusLabels[payrun.status]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Period{" "}
            <span className="font-semibold text-black">
              {payrun.periodStart} → {payrun.periodEnd}
            </span>{" "}
            &bull; Structure{" "}
            <span className="font-semibold text-black">
              {payrun.salaryStructure?.name ?? "Not set"}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {payrun.status === "draft" && (
            <Button onClick={() => actionMutation.mutate("compute")} disabled={isBusy}>
              {actionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Compute
            </Button>
          )}

          {payrun.status === "computed" && (
            <>
              <Button
                onClick={() => actionMutation.mutate("compute")}
                variant="outline"
                disabled={isBusy}
              >
                <Play className="h-4 w-4" />
                Recompute
              </Button>
              <Button
                onClick={() => actionMutation.mutate("validate")}
                disabled={isBusy}
              >
                {actionMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Validate
              </Button>
            </>
          )}

          {payrun.status === "validated" && (
            <Button
              onClick={() => actionMutation.mutate("mark-paid")}
              disabled={isBusy}
            >
              {actionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <DollarSign className="h-4 w-4" />
              )}
              Mark Paid
            </Button>
          )}

          {payrun.status !== "draft" && (
            <Button
              variant="outline"
              onClick={() => sendMutation.mutate()}
              disabled={isBusy || payrun.payslips.length === 0}
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Send Payslips
            </Button>
          )}

          {payrun.status === "paid" && (
            <div className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-xs font-bold text-black">
              <CheckCircle2 className="h-4 w-4" />
              Finalized &amp; Paid
            </div>
          )}
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-3 text-sm font-medium text-black">
          {actionError}
        </div>
      )}

      {sendResult && (
        <div className="rounded-lg border border-zinc-300 bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-black">
              Sent {sendResult.sent} of {sendResult.requested} payslip
              {sendResult.requested === 1 ? "" : "s"}
            </p>
            <button
              type="button"
              onClick={() => setSendResult(null)}
              className="text-xs text-zinc-500 hover:text-black"
            >
              Dismiss
            </button>
          </div>
          {sendResult.failed > 0 && (
            <ul className="mt-2 space-y-1">
              {sendResult.results
                .filter((result) => !result.sent)
                .map((result) => (
                  <li key={result.employeeName} className="text-xs text-zinc-600">
                    <span className="font-medium text-black">
                      {result.employeeName}
                    </span>
                    : {result.reason}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      {/* Lifecycle */}
      <div className="rounded-xl border border-zinc-300 bg-white p-4 shadow-sm">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Payrun Lifecycle
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statusOrder.map((step, index) => {
            const state =
              index < currentIndex
                ? "completed"
                : index === currentIndex
                  ? "current"
                  : "upcoming"

            return (
              <div
                key={step}
                className={`flex items-center justify-between rounded-lg border p-3 transition-all ${
                  state === "current"
                    ? "border-black bg-black font-semibold text-white shadow-sm"
                    : state === "completed"
                      ? "border-zinc-300 bg-zinc-100 font-medium text-black"
                      : "border-zinc-200 bg-white text-zinc-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      state === "current"
                        ? "bg-white text-black"
                        : state === "completed"
                          ? "bg-black text-white"
                          : "bg-zinc-200 text-zinc-600"
                    }`}
                  >
                    {state === "completed" ? "✓" : index + 1}
                  </div>
                  <span className="text-xs">{statusLabels[step]}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Payslips",
            value: `${payrun.totals?.payslipCount ?? 0}`,
            hint: `${payrun.selectedEmployees.length} employees selected`,
          },
          {
            label: "Gross Payroll",
            value: formatINR(Number(payrun.totals?.grossPay ?? 0)),
          },
          {
            label: "Total Deductions",
            value: formatINR(Number(payrun.totals?.totalDeductions ?? 0)),
          },
          {
            label: "Net Payroll",
            value: formatINR(Number(payrun.totals?.netPay ?? 0)),
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-zinc-300 bg-white p-4 shadow-sm"
          >
            <div className="text-xs font-medium text-zinc-500">{card.label}</div>
            <div className="mt-1 text-xl font-bold text-black">{card.value}</div>
            {card.hint && (
              <div className="mt-0.5 text-[11px] text-zinc-500">{card.hint}</div>
            )}
          </div>
        ))}
      </div>

      {/* Warnings surfaced before finalisation */}
      {payrun.warnings.length > 0 && (
        <div className="rounded-xl border border-zinc-300 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-200 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-black" />
              <h2 className="text-sm font-bold text-black">
                Validation warnings
              </h2>
            </div>
            <span className="text-xs text-zinc-500">
              {criticalWarnings.length} critical · {payrun.warnings.length} total
            </span>
          </div>
          <ul className="divide-y divide-zinc-100">
            {payrun.warnings.slice(0, 12).map((warning) => (
              <li
                key={warning.id}
                className="flex items-start gap-3 px-4 py-2.5"
              >
                <Badge
                  variant={criticalCodes.has(warning.code) ? "default" : "outline"}
                  className="mt-0.5 shrink-0"
                >
                  {warning.code.replaceAll("_", " ")}
                </Badge>
                <span className="text-xs text-zinc-700">{warning.message}</span>
              </li>
            ))}
          </ul>
          {payrun.warnings.length > 12 && (
            <div className="border-t border-zinc-200 px-4 py-2 text-xs text-zinc-500">
              +{payrun.warnings.length - 12} more —{" "}
              <Link href="/payroll/anomalies" className="underline hover:text-black">
                view all in Anomaly Detection
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Payslips */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-black">Payslips</h2>
          <span className="text-xs text-zinc-500">
            {payrun.payslips.length > 0
              ? `${payrun.payslips.length} record(s)`
              : "Pending computation"}
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-200 bg-zinc-50">
                <TableHead className="font-semibold text-black">Employee</TableHead>
                <TableHead className="font-semibold text-black">Worked</TableHead>
                <TableHead className="font-semibold text-black">Leave</TableHead>
                <TableHead className="font-semibold text-black">Gross</TableHead>
                <TableHead className="font-semibold text-black">Deductions</TableHead>
                <TableHead className="font-semibold text-black">Net</TableHead>
                <TableHead className="text-right font-semibold text-black">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrun.payslips.length > 0 ? (
                payrun.payslips.map((payslip) => (
                  <TableRow
                    key={payslip.id}
                    className="border-zinc-200 hover:bg-zinc-50"
                  >
                    <TableCell className="font-semibold text-black">
                      {payslip.employeeName}
                      <div className="font-mono text-xs font-normal text-zinc-500">
                        {payslip.employeeCode}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-zinc-800">
                      {payslip.workedDays} d
                    </TableCell>
                    <TableCell className="text-xs text-zinc-800">
                      {payslip.leaveDays} d
                    </TableCell>
                    <TableCell className="text-xs text-zinc-800">
                      {formatINR(Number(payslip.grossPay))}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-800">
                      -{formatINR(Number(payslip.totalDeductions))}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-black">
                      {formatINR(Number(payslip.netPay))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`/api/payslips/${payslip.id}/pdf?download=true`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button variant="ghost" size="sm" className="text-xs">
                            <Download className="h-3.5 w-3.5" />
                            PDF
                          </Button>
                        </a>
                        <Link href={`/payroll/payslips/${payslip.id}`}>
                          <Button variant="outline" size="sm" className="text-xs">
                            <FileText className="h-3.5 w-3.5" />
                            Open
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 py-6 text-zinc-500">
                      <Clock className="h-8 w-8 text-zinc-300" />
                      <p className="text-sm font-bold text-black">
                        {payrun.status === "draft"
                          ? "Payrun is still in draft"
                          : "No payslips generated"}
                      </p>
                      <p className="max-w-sm text-xs text-zinc-500">
                        {payrun.status === "draft"
                          ? "Run Compute to generate payslips from the applicable contracts and salary rules."
                          : "No payslip records are attached to this payrun."}
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
