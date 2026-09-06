import type { Metadata } from "next"
import { Bricolage_Grotesque, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import AppLayout from "@/src/components/layout/AppLayout"

/** Body and interface. Humanist geometry — open counters at small sizes. */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
})

/** Display. Optical sizing gives the hero its tight, drawn-for-this look. */
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
})

/** Figures, identifiers and payroll codes. */
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-ui",
  display: "swap",
})

export const metadata: Metadata = {
  title: "PeoplePay360 — HR & Payroll",
  description:
    "Employees, contracts, attendance, time off and payroll on one spine — so a missed day lands on the payslip without anyone re-keying it.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${jakarta.variable} ${bricolage.variable} ${mono.variable}`}
    >
      <body className="min-h-full flex flex-col">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  )
}
