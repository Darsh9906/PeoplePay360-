import type { Metadata } from "next"
import "./globals.css"
import AppLayout from "@/src/components/layout/AppLayout"

export const metadata: Metadata = {
  title: "PeoplePay360 — HR & Payroll System",
  description: "Modern HR Operations & Payroll Management System",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  )
}
