"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Menu,
  Receipt,
  ShieldCheck,
  Users,
  X,
} from "lucide-react"
import { Wordmark } from "@/src/components/brand/Logo"

const navLinks = [
  { label: "Home", href: "#top" },
  { label: "Platform", href: "#platform" },
  { label: "Features", href: "#features" },
  { label: "Workflow", href: "#workflow" },
  { label: "Contact", href: "#contact" },
]

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
    body: "Sign up with your company email. You become the administrator, and the workspace is yours alone.",
  },
  {
    title: "Invite your team",
    body: "Add people and pick a role. The admin sees a temporary password, copies it, and shares it directly.",
  },
  {
    title: "Run payroll",
    body: "Define salary rules once, then compute, validate and send payslips every period.",
  },
]

const proofPoints = [
  { figure: "5", label: "Roles enforced server-side" },
  { figure: "1", label: "Contract history, no overwrites" },
  { figure: "0", label: "Re-keying between modules" },
  { figure: "360°", label: "View of every employee" },
]

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div id="top" className="min-h-screen bg-white text-zinc-800">
      {/* ================= Sky + hero ================= */}
      <div className="sky-field sky-grain relative isolate overflow-hidden">
        {/* Cloud banks. Purely atmospheric — they drift, slowly. */}
        <div
          aria-hidden
          className="drift pointer-events-none absolute -left-24 top-40 h-72 w-[34rem] rounded-full bg-white/55 blur-3xl"
        />
        <div
          aria-hidden
          className="drift pointer-events-none absolute -right-16 top-24 h-64 w-[28rem] rounded-full bg-white/45 blur-3xl"
          style={{ animationDelay: "-6s" }}
        />

        {/* ---------- Floating nav ---------- */}
        <div className="sticky top-0 z-50 px-4 pt-4 sm:px-6 sm:pt-6">
          <header
            className={`glass mx-auto flex max-w-6xl items-center gap-4 rounded-2xl border border-white/70 px-4 py-3 transition-shadow duration-300 sm:px-5 ${
              scrolled ? "shadow-float" : "shadow-card"
            }`}
          >
            <Link href="#top" className="shrink-0">
              <Wordmark />
            </Link>

            <nav className="mx-auto hidden items-center gap-1 lg:flex">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="rounded-lg px-3.5 py-2 text-[13.5px] font-medium text-zinc-600 transition-colors hover:bg-harbor-50 hover:text-harbor-800"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Link
                href="/login"
                className="hidden h-10 items-center rounded-xl border border-zinc-200 bg-white px-4 text-[13.5px] font-semibold text-harbor-800 transition hover:border-harbor-200 hover:bg-harbor-50 sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-10 items-center rounded-xl bg-harbor-800 px-4 text-[13.5px] font-semibold text-white shadow-[0_6px_16px_-6px_rgba(22,69,106,0.7)] transition hover:bg-harbor-900 active:translate-y-px"
              >
                Get Started
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label="Toggle menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-harbor-800 lg:hidden"
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </header>

          {menuOpen && (
            <div className="glass mx-auto mt-2 max-w-6xl rounded-2xl border border-white/70 p-2 shadow-lift lg:hidden">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-harbor-50"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href="/login"
                className="block rounded-xl px-4 py-2.5 text-sm font-semibold text-harbor-800 hover:bg-harbor-50 sm:hidden"
              >
                Sign in
              </Link>
            </div>
          )}
        </div>

        {/* ---------- Hero ---------- */}
        <section className="relative mx-auto max-w-5xl px-6 pb-28 pt-20 text-center sm:pt-24">
          <p
            className="reveal text-[11px] font-semibold uppercase tracking-[0.24em] text-harbor-700/80"
            style={{ animationDelay: "40ms" }}
          >
            Modern HR management
          </p>

          <h1
            className="reveal mx-auto mt-6 max-w-4xl text-balance font-display text-[2.5rem] font-semibold leading-[1.08] tracking-[-0.035em] text-[#2c5271] sm:text-[3.4rem] lg:text-[3.85rem]"
            style={{ animationDelay: "120ms" }}
          >
            Manage your workforce smarter, faster and more efficiently
          </h1>

          <p
            className="reveal mx-auto mt-7 max-w-2xl text-[15px] leading-relaxed text-zinc-600 sm:text-base"
            style={{ animationDelay: "200ms" }}
          >
            Streamline hiring, attendance, payroll and employee management with an
            all-in-one HR platform designed to simplify operations and help your
            team perform at its best.
          </p>

          <div
            className="reveal mt-10 flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: "280ms" }}
          >
            <Link
              href="/signup"
              className="group inline-flex h-12 items-center gap-2 rounded-xl bg-harbor-800 px-7 text-sm font-semibold text-white shadow-[0_10px_28px_-10px_rgba(22,69,106,0.85)] transition hover:bg-harbor-900 active:translate-y-px"
            >
              Get Started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#platform"
              className="inline-flex h-12 items-center rounded-xl border border-white/80 bg-white px-7 text-sm font-semibold text-harbor-800 shadow-card transition hover:bg-harbor-50"
            >
              Learn More
            </a>
          </div>

          <p
            className="reveal mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-zinc-500"
            style={{ animationDelay: "360ms" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              Free to start
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              Private workspace per company
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              No card required
            </span>
          </p>
        </section>
      </div>

      {/* ================= Proof band ================= */}
      <section id="platform" className="relative z-10 -mt-14 px-6">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-px overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-200 shadow-lift lg:grid-cols-4">
          {proofPoints.map((point) => (
            <div key={point.label} className="bg-white px-6 py-7 text-center">
              <p className="font-display text-3xl font-semibold tracking-tight text-harbor-800">
                {point.figure}
              </p>
              <p className="mt-1.5 text-xs leading-snug text-zinc-500">
                {point.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= The argument ================= */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-harbor-600">
              One spine
            </p>
            <h2 className="mt-4 font-display text-3xl font-semibold leading-[1.15] tracking-tight text-zinc-900 sm:text-[2.6rem]">
              Four lists, or one calculation.
            </h2>
          </div>
          <div className="space-y-5 text-[15px] leading-relaxed text-zinc-600">
            <p>
              Most HR tools keep employees, attendance, leave and salary in four
              separate places, then ask a human to reconcile them at the end of
              every month. That human is where the errors come from.
            </p>
            <p>
              PeoplePay360 treats all four as inputs to one calculation. A missed
              day, an approved leave or a mid-year contract change lands on the
              payslip because it is the same record — not because someone
              remembered to copy it across.
            </p>
            <a
              href="#workflow"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-harbor-700 hover:text-harbor-900"
            >
              See how a period runs
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ================= Modules ================= */}
      <section
        id="features"
        className="border-y border-zinc-200 bg-gradient-to-b from-harbor-50/70 to-white"
      >
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-harbor-600">
              Features
            </p>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-zinc-900 sm:text-[2.6rem]">
              Everything the payroll cycle touches
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-zinc-600">
              Six modules, one data model. Each one is useful alone and compounding
              together.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => (
              <article
                key={module.title}
                className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-harbor-200 hover:shadow-lift"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-harbor-50 text-harbor-700 transition-colors group-hover:bg-harbor-800 group-hover:text-white">
                  <module.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 font-display text-base font-semibold text-zinc-900">
                  {module.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  {module.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ================= Workflow ================= */}
      <section id="workflow" className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-harbor-600">
            Workflow
          </p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-zinc-900 sm:text-[2.6rem]">
            Getting started takes an afternoon
          </h2>
        </div>

        <ol className="mt-12 grid gap-6 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-card"
            >
              <span className="font-mono text-[11px] font-semibold tracking-widest text-harbor-400">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span
                aria-hidden
                className="absolute left-6 right-6 top-[3.35rem] h-px bg-gradient-to-r from-harbor-200 to-transparent"
              />
              <h3 className="mt-6 font-display text-base font-semibold text-zinc-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ================= Closing CTA ================= */}
      <section id="contact" className="px-6 pb-24">
        <div className="sky-grain relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-harbor-900 px-8 py-16 text-center sm:px-16 sm:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-harbor-400/25 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-harbor-300/20 blur-3xl"
          />

          <h2 className="relative font-display text-3xl font-semibold leading-tight tracking-tight text-white sm:text-[2.75rem]">
            Put your people data and your payroll
            <br className="hidden sm:block" /> on the same spine.
          </h2>
          <p className="relative mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-harbor-100/85">
            Create a private workspace for your company in under a minute. You
            become the administrator — invite the rest of the team when you are
            ready.
          </p>
          <div className="relative mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="group inline-flex h-12 items-center gap-2 rounded-xl bg-white px-7 text-sm font-semibold text-harbor-900 transition hover:bg-harbor-50 active:translate-y-px"
            >
              Create your workspace
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center rounded-xl border border-white/25 px-7 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* ================= Footer ================= */}
      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <Wordmark textClassName="text-[15px]" markClassName="h-6 w-6" />
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-400">
            Employee · Contract · Attendance · Time off · Payroll
          </p>
        </div>
      </footer>
    </div>
  )
}
