"use client"

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { formatINR } from "@/src/lib/format"
import type { Contract } from "@/src/types/hr"
import { Search, Filter, Calendar, FileText, XCircle } from "lucide-react"

type ContractApiRow = {
  id: string
  employeeId: string
  employeeName: string
  contractType: string
  salary: number
  startDate: string
  endDate: string
  workingSchedule: string
  displayStatus: "Running" | "Expired"
}

type ContractsApiResponse = {
  data: ContractApiRow[]
}

function mapContractFromApi(contract: ContractApiRow): Contract {
  return {
    id: contract.id,
    employeeId: contract.employeeId,
    employeeName: contract.employeeName,
    contractType: contract.contractType,
    salary: contract.salary,
    startDate: contract.startDate,
    endDate: contract.endDate,
    workingSchedule: contract.workingSchedule,
    status: contract.displayStatus,
  }
}

export default function Contracts() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("ALL")
  const [selectedContractType, setSelectedContractType] = useState("ALL")
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    const controller = new AbortController()

    async function loadContracts() {
      try {
        setIsLoading(true)
        setLoadError("")

        const response = await fetch("/api/contracts", {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error("Unable to load contracts")
        }

        const payload = (await response.json()) as ContractsApiResponse
        setContracts(payload.data.map(mapContractFromApi))
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }

        setLoadError("Could not load contracts from backend.")
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadContracts()

    return () => controller.abort()
  }, [])

  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      const searchLower = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !searchLower ||
        contract.employeeName.toLowerCase().includes(searchLower) ||
        contract.id.toLowerCase().includes(searchLower)

      const matchesStatus =
        selectedStatus === "ALL" || contract.status === selectedStatus

      const matchesType =
        selectedContractType === "ALL" ||
        contract.contractType.toLowerCase() === selectedContractType.toLowerCase()

      return matchesSearch && matchesStatus && matchesType
    })
  }, [contracts, searchQuery, selectedStatus, selectedContractType])

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col gap-2 border-b border-zinc-300 pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-black">
          Contracts
        </h1>
        <p className="text-sm text-zinc-600">
          Manage employment agreements, salary terms, schedules, and active validity periods.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white p-4 rounded-md border border-zinc-300 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search contract by employee name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-zinc-300 focus-visible:ring-black"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-500 hidden sm:block" />
            <Select
              value={selectedContractType}
              onChange={(e) => setSelectedContractType(e.target.value)}
              className="w-40 bg-white border-zinc-300 text-black"
            >
              <option value="ALL">All Types</option>
              <option value="Full Time">Full Time</option>
              <option value="Contract">Contract</option>
              <option value="Part Time">Part Time</option>
            </Select>
          </div>

          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-36 bg-white border-zinc-300 text-black"
          >
            <option value="ALL">All Statuses</option>
            <option value="Running">Running</option>
            <option value="Expiring">Expiring</option>
            <option value="Expired">Expired</option>
            <option value="Draft">Draft</option>
          </Select>

          {(searchQuery || selectedStatus !== "ALL" || selectedContractType !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("")
                setSelectedStatus("ALL")
                setSelectedContractType("ALL")
              }}
              className="text-xs text-zinc-600 hover:text-black"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Contract Table */}
      <div className="rounded-md border border-zinc-300 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 bg-zinc-50">
              <TableHead className="text-black font-semibold">Employee</TableHead>
              <TableHead className="text-black font-semibold">Contract Type</TableHead>
              <TableHead className="text-black font-semibold">Salary (INR)</TableHead>
              <TableHead className="text-black font-semibold">Start Date</TableHead>
              <TableHead className="text-black font-semibold">End Date</TableHead>
              <TableHead className="text-black font-semibold">Working Schedule</TableHead>
              <TableHead className="text-black font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center">
                  <p className="text-sm font-medium text-zinc-500">
                    Loading contract records...
                  </p>
                </TableCell>
              </TableRow>
            ) : loadError ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center text-zinc-500 space-y-2 py-6">
                    <XCircle className="h-10 w-10 text-zinc-300" />
                    <p className="text-base font-semibold text-black">
                      Backend data unavailable
                    </p>
                    <p className="text-xs text-zinc-500 max-w-sm">
                      {loadError}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredContracts.length > 0 ? (
              filteredContracts.map((contract) => {
                const badgeVariant =
                  contract.status === "Running" || contract.status === "Active"
                    ? "running"
                    : contract.status === "Expiring"
                    ? "expiring"
                    : contract.status === "Expired"
                    ? "expired"
                    : "draft"

                return (
                  <TableRow key={contract.id} className="border-zinc-200 hover:bg-zinc-50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-100 text-black font-bold text-xs border border-zinc-300">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-black">
                            {contract.employeeName}
                          </div>
                          <div className="text-xs text-zinc-500 font-mono">
                            {contract.id}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs font-medium text-zinc-700">
                      {contract.contractType}
                    </TableCell>

                    <TableCell className="font-semibold text-black">
                      {formatINR(contract.salary)}
                    </TableCell>

                    <TableCell className="text-xs text-zinc-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                        <span>{contract.startDate}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-zinc-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                        <span>{contract.endDate}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs font-medium text-black">
                      <span className="inline-flex items-center rounded-md bg-zinc-100 border border-zinc-300 px-2 py-1 text-xs">
                        {contract.workingSchedule}
                      </span>
                    </TableCell>

                    <TableCell>
                      <Badge variant={badgeVariant}>{contract.status}</Badge>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-56 text-center">
                  <div className="flex flex-col items-center justify-center text-zinc-500 space-y-2 py-6">
                    <XCircle className="h-10 w-10 text-zinc-300" />
                    <p className="text-base font-semibold text-black">
                      No contracts found
                    </p>
                    <p className="text-xs text-zinc-500 max-w-sm">
                      There are no contract records to display.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
