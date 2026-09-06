"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { Receipt, ShieldCheck, UsersRound } from "lucide-react"
import { LogoMark } from "@/src/components/brand/Logo"

const points = [
  { icon: UsersRound, text: "Employees, attendance and leave in one record" },
  { icon: Receipt, text: "Salary rules turn that record into payslips" },
  { icon: ShieldCheck, text: "Five roles, enforced on the server" },
]

/**
 * Two-up auth shell: the form on white, the brand on primary navy. Below lg
 * the panel drops away and the form takes the whole card.
 */
export default function AuthSplit({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <main className="auth-canvas sky-grain relative flex min-h-screen p-4 sm:p-6 lg:p-10">
      <div className="m-auto grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-float lg:grid-cols-2">
        {/* ---------------- Form side ---------------- */}
        <div className="flex flex-col p-6 sm:p-9">
          <Link href="/" className="self-start" aria-label="PeoplePay360 home">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-harbor-700 to-harbor-900 text-white shadow-[0_10px_22px_-12px_rgba(22,69,106,0.95)] transition-transform hover:-translate-y-0.5">
              <LogoMark className="h-6 w-6" />
            </span>
          </Link>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
            <h1 className="font-display text-[1.4rem] font-semibold tracking-[-0.025em] text-zinc-900">
              {title}
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500">{subtitle}</p>

            <div className="my-6 h-px bg-zinc-200" />

            {children}

            <div className="mt-6 text-center text-[13px] text-zinc-500">{footer}</div>
          </div>
        </div>

        {/* ---------------- Brand side ---------------- */}
        <div className="brand-panel relative hidden flex-col justify-center p-9 lg:flex">
          <h2 className="font-display text-[1.9rem] font-semibold leading-[1.12] tracking-[-0.03em] text-white">
            Your people data
            <br />
            and your payroll,
            <br />
            on one spine.
          </h2>

          <ul className="mt-8 space-y-3">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-harbor-100 ring-1 ring-inset ring-white/15">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="text-[13px] leading-snug text-harbor-100/85">
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  )
}
