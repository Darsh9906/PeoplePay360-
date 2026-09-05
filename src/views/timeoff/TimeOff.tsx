"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/src/context/AuthContext"
import Allocations from "./Allocations"
import Requests from "./Requests"
import TimeOffTypes from "./Types"

const tabs = [
  { key: "requests" as const, label: "Requests" },
  { key: "allocations" as const, label: "Allocations" },
  { key: "types" as const, label: "Time Off Types" },
]

type TabKey = (typeof tabs)[number]["key"]

export default function TimeOff() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabKey>(
    searchParams.get("view") === "allocations" ? "allocations" : "requests",
  )

  // Allocations and policy configuration belong to HR, not self-service.
  const visibleTabs = useMemo(
    () =>
      user?.role === "employee"
        ? tabs.filter((tab) => tab.key === "requests")
        : tabs,
    [user?.role],
  )

  return (
    <div className="space-y-5">
      <header className="border-b border-zinc-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-black">Time Off</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Leave requests, employee allocations, and the leave policies behind
          them.
        </p>
      </header>

      <div className="flex gap-1 overflow-x-auto border-b border-zinc-300">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-xs font-semibold transition ${
              activeTab === tab.key
                ? "border-black text-black"
                : "border-transparent text-zinc-500 hover:text-black"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "requests" && <Requests />}
      {activeTab === "allocations" && visibleTabs.length > 1 && <Allocations />}
      {activeTab === "types" && visibleTabs.length > 1 && <TimeOffTypes />}
    </div>
  )
}
