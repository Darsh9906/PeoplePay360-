"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Menu, X } from "lucide-react"
import { LogoMark } from "@/src/components/brand/Logo"

const navLinks = [
  { label: "Home", href: "#top" },
  { label: "Product", href: "#product" },
  { label: "Sign in", href: "/login" },
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
    <div id="top" className="sky-field sky-grain relative min-h-screen overflow-hidden">
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
          <Link href="#top" className="shrink-0" aria-label="PeoplePay360 home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-harbor-800 text-white shadow-[0_8px_18px_-10px_rgba(22,69,106,0.95)] transition-transform hover:-translate-y-0.5">
              <LogoMark className="h-[22px] w-[22px]" />
            </span>
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
          </div>
        )}
      </div>

      {/* ---------- Hero ---------- */}
      <section className="relative mx-auto max-w-6xl px-6 pb-8 pt-12 text-center sm:pt-14">
        <p
          className="reveal text-[11px] font-semibold uppercase tracking-[0.24em] text-harbor-700/80"
          style={{ animationDelay: "40ms" }}
        >
          Modern HR management
        </p>

        <h1
          className="reveal mx-auto mt-6 font-display text-[2.5rem] font-semibold leading-[1.08] tracking-[-0.035em] text-[#2c5271] sm:text-[3.4rem] lg:text-[3.75rem]"
          style={{ animationDelay: "120ms" }}
        >
          Manage your workforce smarter,
          {/* Fixed break so the headline reads as two balanced lines; below sm
              it wraps naturally instead. */}
          <br className="hidden sm:block" /> faster and more efficiently
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
            href="#product"
            className="inline-flex h-12 items-center rounded-xl border border-white/80 bg-white px-7 text-sm font-semibold text-harbor-800 shadow-card transition hover:bg-harbor-50"
          >
            Learn More
          </a>
        </div>

      </section>

      {/* ---------- Product shot ---------- */}
      <section id="product" className="relative px-4 pb-20 sm:px-6">
        <div
          className="reveal mx-auto max-w-6xl overflow-hidden rounded-t-[1.5rem] border border-white/70 bg-white/60 p-1.5 shadow-float backdrop-blur-sm sm:rounded-t-[2rem] sm:p-2"
          style={{ animationDelay: "440ms" }}
        >
          <Image
            src="/dashboard-preview.png"
            alt="The PeoplePay360 dashboard: headcount, payslips, attendance exceptions and payroll warnings, with payroll cost trend and department cost breakdown."
            width={2400}
            height={1568}
            priority
            className="w-full rounded-t-[1.1rem] sm:rounded-t-[1.5rem]"
          />
        </div>
      </section>

      <footer className="relative border-t border-white/60 bg-white/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <LogoMark className="h-6 w-6 text-harbor-800" label="PeoplePay360" />
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-400">
            Employee · Contract · Attendance · Time off · Payroll
          </p>
        </div>
      </footer>
    </div>
  )
}
