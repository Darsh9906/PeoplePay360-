"use client"

import Link from "next/link"
import {
  ArrowRight,
  CalendarDays,
  Clock,
  FileText,
  Receipt,
  ShieldCheck,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const modules = [
  {
    icon: Users,
    title: "Employee master",
    body: "Kanban and list views over one employee form, with contracts, attendance and time off one click away.",
  },
  {
    icon: FileText,
    title: "Contracts",
    body: "Keep the full history. Payroll only ever uses the contract that covers the period being run.",
  },
  {
    icon: Clock,
    title: "Attendance",
    body: "Check-in, check-out and worked hours, with exceptions surfaced before they reach a payslip.",
  },
  {
    icon: CalendarDays,
    title: "Time off",
    body: "Types, allocations and requests. Approving a request draws the days down from the balance automatically.",
  },
  {
    icon: Receipt,
    title: "Payroll",
    body: "Ordered salary rules turn contracts and attendance into payslips, with warnings before you finalise.",
  },
  {
    icon: ShieldCheck,
    title: "Roles",
    body: "Five roles from Employee to Admin, enforced on the server rather than hidden in the interface.",
  },
]

const steps = [
  {
    title: "Create your workspace",
    body: "Sign up with your company email. You become the administrator.",
  },
  {
    title: "Invite your team",
    body: "Add people and pick a role. The admin sees a temporary password, copies it, and shares it directly.",
  },
  {
    title: "Run payroll",
    body: "Define salary rules once, then compute, validate and send payslips each period.",
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-black">
      {/* Top bar */}
      <header className="border-b border-zinc-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight">PeoplePay360</span>
            <span className="text-[11px] text-zinc-500">HR &amp; Payroll</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="outline" className="text-xs">
                Sign in
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="text-xs">Create workspace</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 sm:pt-24">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Integrated HR and payroll operations
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Your people data and your payroll, on one spine.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg">
          Most HR tools keep employees, attendance, leave and salary in four
          separate lists. PeoplePay360 treats them as inputs to one calculation —
          so a missed day, an approved leave or a mid-year contract change lands
          on the payslip without anyone re-keying it.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link href="/signup">
            <Button className="gap-2">
              Create your workspace
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline">I already have an account</Button>
          </Link>
          <p className="text-xs text-zinc-500">
            Free to start · Your company keeps its own private workspace
          </p>
        </div>
      </section>

      {/* Modules */}
      <section className="border-y border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-xl font-bold tracking-tight">
            Everything the payroll cycle touches
          </h2>
          <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => (
              <div key={module.title} className="bg-white p-6">
                <module.icon className="h-5 w-5 text-black" />
                <h3 className="mt-3 text-sm font-bold">{module.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
                  {module.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it starts */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-xl font-bold tracking-tight">Getting started</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="border-t-2 border-black pt-4">
              <span className="font-mono text-xs font-semibold text-zinc-500">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 text-sm font-bold">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-zinc-200">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-zinc-500">
          <span>PeoplePay360 — HR &amp; Payroll</span>
          <span>Employee · Contract · Attendance · Time Off · Payroll</span>
        </div>
      </footer>
    </div>
  )
}
