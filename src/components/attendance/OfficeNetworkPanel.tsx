"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  LogIn,
  LogOut,
  RotateCw,
  Wifi,
  WifiOff,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { apiRequest } from "@/src/lib/api"

type NetworkStatus = {
  configured: boolean
  verified: boolean
  currentIp: string | null
  officeName: string
}

type TodayRecord = {
  id: string
  attendanceDate: string
  checkIn?: string | null
  checkOut?: string | null
  workedHours: string | number
  status: "present" | "late" | "absent" | "half_day"
}

type SelfStatus = {
  employeeLinked: boolean
  today: TodayRecord | null
  network: NetworkStatus
}

function time(value?: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function Line({
  tone,
  icon,
  title,
  description,
}: {
  tone: "good" | "warn" | "bad"
  icon: React.ReactNode
  title: string
  description?: string
}) {
  const styles = {
    good: "border-success/20 bg-success-soft text-success",
    warn: "border-warning/20 bg-warning-soft text-warning",
    bad: "border-danger/20 bg-danger-soft text-danger",
  }[tone]

  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 ${styles}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>
        <span className="block text-[13px] font-semibold">{title}</span>
        {description && (
          <span className="mt-0.5 block text-xs opacity-90">{description}</span>
        )}
      </span>
    </div>
  )
}

/**
 * Office-network gated self check-in.
 *
 * Verification is decided server-side from the request's own IP (see
 * api/_lib/network.ts) — the client is only ever told pass or fail, and the
 * buttons enable only once the server has said the network is approved. Used
 * by both the HR attendance page and an employee's own attendance page, so the
 * rule is enforced in one place.
 */
export default function OfficeNetworkPanel() {
  const queryClient = useQueryClient()
  const [devIp, setDevIp] = useState("")
  const [actionError, setActionError] = useState<string | null>(null)

  // Dev-only: `next dev` on localhost sets no forwarding header, so without
  // this the panel could only ever show "unavailable". Stripped from prod.
  const devHeaders =
    process.env.NODE_ENV === "development" && devIp.trim()
      ? { "Content-Type": "application/json", "x-dev-office-ip": devIp.trim() }
      : undefined

  const statusQuery = useQuery({
    queryKey: ["attendance", "self", devIp],
    queryFn: () =>
      apiRequest<SelfStatus>(
        "/api/attendance/self",
        devHeaders ? { headers: devHeaders } : undefined,
      ),
  })

  const action = useMutation({
    mutationFn: (act: "check-in" | "check-out") =>
      apiRequest("/api/attendance/self", {
        method: "POST",
        body: JSON.stringify({ action: act }),
        ...(devHeaders ? { headers: devHeaders } : {}),
      }),
    onMutate: () => setActionError(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] })
      queryClient.invalidateQueries({ queryKey: ["my-attendance"] })
    },
    onError: (error: unknown) =>
      setActionError(error instanceof Error ? error.message : "Something went wrong."),
  })

  // On a failed refetch the query still holds the previous result. Trusting it
  // would show "unable to verify" above an enabled Check in button, so a stale
  // status counts as no status. The server re-verifies on POST regardless, so
  // this is about not lying to the user rather than about enforcement.
  const isStale = statusQuery.isError
  const status = isStale ? undefined : statusQuery.data
  const today = status?.today
  const network = status?.network
  const checkedIn = Boolean(today?.checkIn)
  const checkedOut = Boolean(today?.checkOut)
  const canAct =
    Boolean(status?.employeeLinked && network?.verified) && !action.isPending

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-[15px] font-semibold tracking-[-0.015em] text-zinc-900">
            Office network check-in
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            You can mark yourself present only from the office network.
          </p>
        </div>
        <button
          type="button"
          onClick={() => statusQuery.refetch()}
          disabled={statusQuery.isFetching}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 text-xs font-semibold text-zinc-600 transition hover:bg-harbor-50 hover:text-harbor-800 disabled:opacity-50"
        >
          <RotateCw
            className={`h-3.5 w-3.5 ${statusQuery.isFetching ? "animate-spin" : ""}`}
          />
          Re-check
        </button>
      </div>

      <div className="mt-4 space-y-3" role="status" aria-live="polite">
        {statusQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying office network…
          </div>
        ) : isStale || !status ? (
          <Line
            tone="bad"
            icon={<AlertTriangle className="h-4 w-4" />}
            title="Unable to verify the office network"
            description="Could not reach the verification service. Try Re-check."
          />
        ) : !status.employeeLinked ? (
          <Line
            tone="warn"
            icon={<AlertTriangle className="h-4 w-4" />}
            title="No linked employee profile"
            description="Your account is not linked to an employee record, so self check-in is unavailable. Ask an administrator to link it."
          />
        ) : checkedIn && checkedOut ? (
          <Line
            tone="good"
            icon={<CheckCircle2 className="h-4 w-4" />}
            title="Attendance recorded for today"
            description={`Checked in ${time(today?.checkIn)} · out ${time(today?.checkOut)} · ${Number(today?.workedHours ?? 0).toFixed(2)} h`}
          />
        ) : !network?.configured ? (
          <Line
            tone="warn"
            icon={<WifiOff className="h-4 w-4" />}
            title="Office network is not configured"
            description="An administrator needs to set the approved office IP before check-in can be verified."
          />
        ) : network.verified ? (
          <Line
            tone="good"
            icon={<CheckCircle2 className="h-4 w-4" />}
            title="Office network verified"
            description={`${network.officeName} · IP verification successful`}
          />
        ) : (
          <Line
            tone="warn"
            icon={<WifiOff className="h-4 w-4" />}
            title="Not on the office network"
            description={`Connect to ${network.officeName} to check in.`}
          />
        )}

        {network?.currentIp && (
          <p className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-500">
            <Wifi className="h-3 w-3" />
            Current IP: {network.currentIp}
          </p>
        )}

        {status?.employeeLinked && !(checkedIn && checkedOut) && (
          <p className="text-xs text-zinc-500">
            {checkedIn
              ? `Checked in at ${time(today?.checkIn)} — not checked out yet.`
              : "You have not checked in today."}
          </p>
        )}

        {actionError && (
          <p className="rounded-xl border border-danger/20 bg-danger-soft px-3 py-2.5 text-xs font-medium text-danger">
            {actionError}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {status && !checkedIn && (
            <button
              type="button"
              onClick={() => action.mutate("check-in")}
              disabled={!canAct}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-harbor-900 to-harbor-600 px-5 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgba(22,69,106,0.9)] transition hover:brightness-110 disabled:pointer-events-none disabled:opacity-40"
            >
              <LogIn className="h-4 w-4" />
              {action.isPending ? "Checking in…" : "Check in"}
            </button>
          )}

          {status && checkedIn && !checkedOut && (
            <button
              type="button"
              onClick={() => action.mutate("check-out")}
              disabled={!canAct}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 px-5 text-sm font-semibold text-harbor-800 transition hover:bg-harbor-50 disabled:pointer-events-none disabled:opacity-40"
            >
              <LogOut className="h-4 w-4" />
              {action.isPending ? "Checking out…" : "Check out"}
            </button>
          )}

        </div>
      </div>

      {/*
        Dev-only. `next build` resolves NODE_ENV statically and strips this
        block, so it does not exist in a production bundle. It lets the three
        verification outcomes be demonstrated locally, where no proxy sets
        x-forwarded-for and detection would otherwise always be unavailable.
      */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-5 border-t border-dashed border-zinc-200 pt-4">
          <label
            htmlFor="dev-office-ip"
            className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400"
          >
            Dev only — simulate detected IP (never active in production)
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="dev-office-ip"
              value={devIp}
              onChange={(event) => setDevIp(event.target.value)}
              placeholder="e.g. 203.0.113.10 — blank uses real detection"
              className="h-9 text-xs"
            />
            {devIp && (
              <button
                type="button"
                onClick={() => setDevIp("")}
                className="h-9 shrink-0 rounded-lg px-2.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
