"use client"

import { useQuery } from "@tanstack/react-query"
import { Briefcase, CalendarClock, Loader2, Mail, UserRound } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/src/context/AuthContext"
import { formatINR, formatStatus } from "@/src/lib/format"
import { apiRequest } from "@/src/lib/api"

type MyEmployee = {
  id: string
  employeeCode: string
  fullName: string
  workEmail: string
  jobTitle: string
  department: string
  status: string
  hireDate: string
  managerName: string | null
  workingSchedule: { name: string; weeklyHours: string } | null
  contracts: {
    id: string
    startDate: string
    endDate: string | null
    status: string
    monthlyWage: string
    currency: string
  }[]
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-zinc-300 bg-white p-10 text-center shadow-sm">
      <UserRound className="mx-auto h-6 w-6 text-zinc-300" />
      <p className="mt-2 text-sm font-semibold text-black">{message}</p>
      <p className="mt-1 text-xs text-zinc-500">
        Ask your HR team to link your account to an employee record.
      </p>
    </div>
  )
}

export default function MyProfile() {
  const { user } = useAuth()
  const employeeId = user?.employee?.id

  const profileQuery = useQuery({
    queryKey: ["my-profile", employeeId],
    enabled: Boolean(employeeId),
    queryFn: () => apiRequest<MyEmployee>(`/api/employees/${employeeId}`),
  })

  if (!employeeId) {
    return (
      <div className="space-y-6">
        <header className="border-b border-zinc-200 pb-5">
          <h1 className="text-2xl font-bold tracking-tight text-black">My Profile</h1>
        </header>
        <EmptyState message="No employee record is linked to your account" />
      </div>
    )
  }

  if (profileQuery.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading your profile...
      </div>
    )
  }

  const profile = profileQuery.data

  if (!profile) {
    return <EmptyState message="Could not load your profile" />
  }

  const activeContract = profile.contracts?.find(
    (contract) => contract.status === "active",
  )

  const details = [
    { label: "Employee code", value: profile.employeeCode },
    { label: "Job title", value: profile.jobTitle },
    { label: "Department", value: profile.department },
    { label: "Manager", value: profile.managerName ?? "Not assigned" },
    { label: "Joined", value: profile.hireDate },
    {
      label: "Working schedule",
      value: profile.workingSchedule
        ? `${profile.workingSchedule.name} · ${Number(profile.workingSchedule.weeklyHours).toFixed(2)} hrs/week`
        : "Not assigned",
    },
  ]

  return (
    <div className="space-y-6">
      <header className="border-b border-zinc-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-black">My Profile</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Your employment details as HR has them recorded.
        </p>
      </header>

      {/* Identity card */}
      <div className="rounded-xl border border-zinc-300 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-lg font-bold text-black">
            {profile.fullName
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold text-black">{profile.fullName}</h2>
              <Badge variant={profile.status === "active" ? "active" : "inactive"}>
                {formatStatus(profile.status)}
              </Badge>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-600">
              <Briefcase className="h-3.5 w-3.5 text-zinc-400" />
              {profile.jobTitle} · {profile.department}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-zinc-500">
              <Mail className="h-3.5 w-3.5 text-zinc-400" />
              {profile.workEmail}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 border-t border-zinc-200 pt-5 sm:grid-cols-2 lg:grid-cols-3">
          {details.map((item) => (
            <div key={item.label}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                {item.label}
              </p>
              <p className="mt-1 text-sm font-medium text-black">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Current pay */}
      <div className="rounded-xl border border-zinc-300 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-bold text-black">Current contract</h2>
        </div>
        {activeContract ? (
          <div className="mt-4 grid gap-5 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Monthly wage
              </p>
              <p className="mt-1 text-lg font-bold text-black">
                {formatINR(activeContract.monthlyWage)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Started
              </p>
              <p className="mt-1 text-sm font-medium text-black">
                {activeContract.startDate}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Ends
              </p>
              <p className="mt-1 text-sm font-medium text-black">
                {activeContract.endDate ?? "Ongoing"}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">
            No active contract is recorded. Contact your HR team.
          </p>
        )}
      </div>

      {/* Contract history */}
      {profile.contracts?.length > 1 && (
        <div className="overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm">
          <div className="border-b border-zinc-200 p-4">
            <h2 className="text-sm font-bold text-black">Contract history</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-200 bg-zinc-50">
                <TableHead className="font-semibold text-black">Period</TableHead>
                <TableHead className="font-semibold text-black">Wage</TableHead>
                <TableHead className="text-right font-semibold text-black">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profile.contracts.map((contract) => (
                <TableRow key={contract.id} className="border-zinc-200">
                  <TableCell className="font-mono text-xs text-zinc-700">
                    {contract.startDate} → {contract.endDate ?? "Ongoing"}
                  </TableCell>
                  <TableCell className="text-sm font-semibold text-black">
                    {formatINR(contract.monthlyWage)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={contract.status === "active" ? "active" : "inactive"}
                    >
                      {formatStatus(contract.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
