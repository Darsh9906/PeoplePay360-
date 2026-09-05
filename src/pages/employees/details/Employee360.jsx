"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Phone,
  UserRound,
  WalletCards,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const tabs = ["Overview", "Contracts", "Attendance", "Time Off", "Payslips"]

const summary = [
  { label: "Contracts", value: "2", icon: FileText }, 
  { label: "Attendance", value: "22", icon: Clock3 },
  { label: "Time Off", value: "3", icon: CalendarDays },
  { label: "Payslips", value: "5", icon: WalletCards },
]

function initials(name) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2)
}

function OverviewTab({ employee }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <Card className="border-zinc-300 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-200 p-5"><h2 className="font-semibold text-black">Employment Snapshot</h2><p className="mt-1 text-xs text-zinc-500">Current role and reporting details</p></CardHeader>
        <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
          <div><p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Current Position</p><p className="mt-1 font-medium text-black">{employee.position}</p><p className="mt-1 text-xs text-zinc-500">{employee.department} · {employee.contractType}</p></div>
          <div><p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Reporting Manager</p><p className="mt-1 font-medium text-black">{employee.manager}</p><p className="mt-1 text-xs text-zinc-500">Engineering leadership</p></div>
          <div><p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Joining Date</p><p className="mt-1 font-medium text-black">{employee.joiningDate}</p><p className="mt-1 text-xs text-zinc-500">1 year, 6 months of service</p></div>
          <div><p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Work Location</p><p className="mt-1 font-medium text-black">Ahmedabad, India</p><p className="mt-1 flex items-center gap-1 text-xs text-zinc-500"><MapPin className="h-3 w-3" /> Main office</p></div>
        </CardContent>
      </Card>

      <Card className="border-zinc-300 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-200 p-5"><h2 className="font-semibold text-black">Activity Overview</h2><p className="mt-1 text-xs text-zinc-500">Recent employee activity</p></CardHeader>
        <CardContent className="space-y-4 p-5"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-black" /><div><p className="text-sm font-medium text-black">Attendance is up to date</p><p className="text-xs text-zinc-500">22 days recorded this period</p></div></div><div className="flex items-start gap-3"><FileText className="mt-0.5 h-4 w-4 text-zinc-500" /><div><p className="text-sm font-medium text-black">Contract is active</p><p className="text-xs text-zinc-500">Last reviewed 01 April 2025</p></div></div><div className="flex items-start gap-3"><CalendarDays className="mt-0.5 h-4 w-4 text-zinc-500" /><div><p className="text-sm font-medium text-black">3 time-off requests</p><p className="text-xs text-zinc-500">1 request pending approval</p></div></div></CardContent>
      </Card>
    </div>
  )
}

function ContractsTab() {
  return <Card className="border-zinc-300 bg-white shadow-sm"><CardHeader className="border-b border-zinc-200 p-5"><h2 className="font-semibold text-black">Contracts</h2><p className="mt-1 text-xs text-zinc-500">Employment agreements for this employee</p></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow className="border-zinc-200 bg-zinc-50"><TableHead className="text-zinc-600">Contract Type</TableHead><TableHead className="text-zinc-600">Start Date</TableHead><TableHead className="text-zinc-600">End Date</TableHead><TableHead className="text-zinc-600">Status</TableHead></TableRow></TableHeader><TableBody><TableRow className="border-zinc-200"><TableCell className="font-medium text-black">Full-time Employment</TableCell><TableCell className="text-zinc-600">12 Mar 2024</TableCell><TableCell className="text-zinc-600">11 Mar 2026</TableCell><TableCell><Badge variant="active">Active</Badge></TableCell></TableRow><TableRow className="border-zinc-200"><TableCell className="font-medium text-black">Probation Agreement</TableCell><TableCell className="text-zinc-600">12 Mar 2024</TableCell><TableCell className="text-zinc-600">11 Jun 2024</TableCell><TableCell><Badge variant="expired">Expired</Badge></TableCell></TableRow></TableBody></Table></CardContent></Card>
}

function PlaceholderTab({ title, description, icon: Icon }) {
  return <Card className="border-zinc-300 bg-white shadow-sm"><CardContent className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><span className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-zinc-100 text-zinc-500"><Icon className="h-5 w-5" /></span><h2 className="font-semibold text-black">{title}</h2><p className="mt-2 max-w-md text-sm text-zinc-500">{description}</p><Badge className="mt-4" variant="outline">Ready for records</Badge></CardContent></Card>
}

export default function Employee360() {
  const router = useRouter()
  const { id } = useParams()
  const [employee, setEmployee] = useState(null)
  const [activeTab, setActiveTab] = useState("Overview")

  useEffect(() => {
    const savedEmployees = window.localStorage.getItem("peoplepay360-employees")
    const employees = savedEmployees ? JSON.parse(savedEmployees) : []
    const matchingEmployee = employees.find((item) => item.id === id)

    if (matchingEmployee) {
      window.setTimeout(() => setEmployee({
        ...matchingEmployee,
        name: `${matchingEmployee.firstName} ${matchingEmployee.lastName}`,
        manager: "Not assigned",
        joiningDate: "Not available",
      }), 0)
    }
  }, [id])

  if (!employee) {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <h1 className="text-xl font-semibold text-black">Employee not found</h1>
        <p className="text-sm text-zinc-500">Create an employee from the Employees page before opening this profile.</p>
        <Button variant="outline" onClick={() => router.push("/employees")}><ArrowLeft className="h-4 w-4" /> Back to Employees</Button>
      </main>
    )
  }

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-zinc-300 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-black text-lg font-semibold text-white">{initials(employee.name)}</div><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold tracking-tight text-black">{employee.name}</h1><Badge variant="active">{employee.status}</Badge></div><p className="mt-1 text-sm text-zinc-600">{employee.position} · {employee.department}</p><p className="mt-2 text-xs font-mono text-zinc-500">{employee.id}</p></div></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /> Back to Employees</Button><Button><Pencil className="h-4 w-4" /> Edit Employee</Button></div>
      </header>

      <Card className="border-zinc-300 bg-white shadow-sm"><CardHeader className="border-b border-zinc-200 p-5"><h2 className="font-semibold text-black">Personal Information</h2></CardHeader><CardContent className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3"><div className="flex gap-3"><UserRound className="mt-0.5 h-4 w-4 text-zinc-400" /><div><p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Employee ID</p><p className="mt-1 text-sm font-medium text-black">{employee.id}</p></div></div><div className="flex gap-3"><Mail className="mt-0.5 h-4 w-4 text-zinc-400" /><div><p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Email</p><a className="mt-1 block text-sm font-medium text-black hover:underline" href={`mailto:${employee.email}`}>{employee.email}</a></div></div><div className="flex gap-3"><Phone className="mt-0.5 h-4 w-4 text-zinc-400" /><div><p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Phone</p><p className="mt-1 text-sm font-medium text-black">{employee.phone}</p></div></div><div><p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Department</p><p className="mt-1 text-sm font-medium text-black">{employee.department}</p></div><div><p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Manager</p><p className="mt-1 text-sm font-medium text-black">{employee.manager}</p></div><div><p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Joining Date</p><p className="mt-1 text-sm font-medium text-black">{employee.joiningDate}</p></div></CardContent></Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{summary.map(({ label, value, icon: Icon }) => <Card key={label} className="border-zinc-300 bg-white shadow-sm"><CardContent className="flex items-center justify-between p-5"><div><p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p><p className="mt-2 text-2xl font-semibold text-black">{value}</p></div><Icon className="h-5 w-5 text-zinc-400" /></CardContent></Card>)}</section>

      <section className="space-y-4"><div className="flex gap-1 overflow-x-auto border-b border-zinc-300">{tabs.map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-xs font-semibold transition ${activeTab === tab ? "border-black text-black" : "border-transparent text-zinc-500 hover:text-black"}`}>{tab}</button>)}</div>{activeTab === "Overview" && <OverviewTab employee={employee} />}{activeTab === "Contracts" && <ContractsTab />}{activeTab === "Attendance" && <PlaceholderTab icon={Clock3} title="Attendance records" description="Attendance history, working hours, and exceptions will appear here when records are available." />}{activeTab === "Time Off" && <PlaceholderTab icon={CalendarDays} title="Time off activity" description={`Leave balances and requests for ${employee.name} will appear here when records are available.`} />}{activeTab === "Payslips" && <PlaceholderTab icon={WalletCards} title="Payslip history" description="Monthly payslips and payroll breakdowns will appear here when records are available." />}</section>
    </main>
  )
}
