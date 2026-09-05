import Link from "next/link"
import {
  AlertTriangle,
  ArrowUpRight,
  FileCheck2,
  UserRound,
  UsersRound,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const departmentData = [
  { name: "Engineering", value: 82 },
  { name: "Sales", value: 61 },
  { name: "Operations", value: 48 },
  { name: "HR", value: 27 },
  { name: "Finance", value: 30 },
]

const growthData = [218, 225, 231, 236, 242, 248]

const recentEmployees = [
  { name: "Aarav Mehta", title: "Software Engineer", department: "Engineering" },
  { name: "Maya Shah", title: "HR Manager", department: "Human Resources" },
  { name: "Rohan Patel", title: "Sales Executive", department: "Sales" },
  { name: "Nisha Rao", title: "Payroll Specialist", department: "Finance" },
]

const kpis = [
  { label: "Employees", value: "248", detail: "Total workforce", icon: UsersRound },
  { label: "Active Contracts", value: "231", detail: "93.1% of workforce", icon: FileCheck2 },
  { label: "Expiring Soon", value: "7", detail: "Within 30 days", icon: AlertTriangle },
  { label: "User Accounts", value: "12", detail: "Workspace access", icon: UserRound },
]

function initials(name) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2)
}

function GrowthChart() {
  const points = growthData.map((value, index) => `${index * 60 + 10},${100 - ((value - 210) / 40) * 80}`).join(" ")

  return (
    <div className="space-y-3">
      <svg className="h-44 w-full overflow-visible" viewBox="0 0 320 120" role="img" aria-label="Employee growth from April to September">
        <line x1="10" y1="100" x2="310" y2="100" stroke="currentColor" className="text-zinc-200" />
        <line x1="10" y1="60" x2="310" y2="60" stroke="currentColor" strokeDasharray="3 4" className="text-zinc-200" />
        <line x1="10" y1="20" x2="310" y2="20" stroke="currentColor" strokeDasharray="3 4" className="text-zinc-200" />
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-black" />
        {growthData.map((value, index) => {
          const x = index * 60 + 10
          const y = 100 - ((value - 210) / 40) * 80
          return <circle key={value} cx={x} cy={y} r="3.5" fill="white" stroke="currentColor" strokeWidth="2" className="text-black" />
        })}
      </svg>
      <div className="grid grid-cols-6 text-center text-[10px] text-zinc-500">
        {['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'].map((month) => <span key={month}>{month}</span>)}
      </div>
    </div>
  )
}

export default function Dashboard() {
  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-1 border-b border-zinc-300 pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-black">Dashboard</h1>
        <p className="text-sm text-zinc-600">Overview of workforce, contracts and HR operations.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, detail, icon: Icon }) => (
          <Card key={label} className="border-zinc-300 bg-white shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span><Icon className="h-4 w-4 text-zinc-400" /></div>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-black">{value}</p>
              <p className="mt-1 text-xs text-zinc-500">{detail}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="border-zinc-300 bg-white shadow-sm">
          <CardHeader className="border-b border-zinc-200 p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-black">Employee Distribution</h2><p className="mt-1 text-xs text-zinc-500">Workforce by department</p></div><Badge variant="outline">248 total</Badge></div></CardHeader>
          <CardContent className="space-y-4 p-5">
            {departmentData.map((department) => <div key={department.name} className="grid grid-cols-[92px_1fr_28px] items-center gap-3 text-xs"><span className="truncate text-zinc-600">{department.name}</span><div className="h-2 rounded-full bg-zinc-100"><div className="h-2 rounded-full bg-black" style={{ width: `${(department.value / 82) * 100}%` }} /></div><span className="text-right font-semibold text-black">{department.value}</span></div>)}
          </CardContent>
        </Card>

        <Card className="border-zinc-300 bg-white shadow-sm">
          <CardHeader className="border-b border-zinc-200 p-5"><div><h2 className="font-semibold text-black">Contract Status</h2><p className="mt-1 text-xs text-zinc-500">Current agreement portfolio</p></div></CardHeader>
          <CardContent className="flex items-center gap-8 p-5">
            <div className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full" style={{ background: "conic-gradient(#111 0deg 338deg, #737373 338deg 348deg, #a3a3a3 348deg 352deg, #d4d4d4 352deg 360deg)" }}><div className="grid h-24 w-24 place-items-center rounded-full bg-white"><strong className="text-2xl text-black">246</strong><span className="text-[10px] text-zinc-500">tracked</span></div></div>
            <div className="grid flex-1 grid-cols-2 gap-3 text-xs">{[{ label: "Active", value: 231, tone: "bg-black" }, { label: "Expiring Soon", value: 7, tone: "bg-zinc-500" }, { label: "Expired", value: 3, tone: "bg-zinc-400" }, { label: "Draft", value: 5, tone: "bg-zinc-200" }].map((item) => <div key={item.label} className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${item.tone}`} /><span className="text-zinc-600">{item.label}</span><strong className="ml-auto text-black">{item.value}</strong></div>)}</div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <Card className="border-zinc-300 bg-white shadow-sm"><CardHeader className="border-b border-zinc-200 p-5"><div><h2 className="font-semibold text-black">Employee Growth</h2><p className="mt-1 text-xs text-zinc-500">Monthly workforce trend</p></div></CardHeader><CardContent className="p-5"><GrowthChart /></CardContent></Card>
        <Card className="border-zinc-300 bg-white shadow-sm"><CardHeader className="border-b border-zinc-200 p-5"><h2 className="font-semibold text-black">Needs Attention</h2><p className="mt-1 text-xs text-zinc-500">Items requiring follow-up</p></CardHeader><CardContent className="space-y-2 p-5">{[{ label: "7 contracts expiring soon", href: "/contracts" }, { label: "3 contracts require renewal", href: "/contracts" }, { label: "2 inactive user accounts", href: "/users" }].map((item) => <Link key={item.label} href={item.href} className="flex items-center gap-3 rounded-md border border-zinc-200 p-3 text-sm text-zinc-700 transition hover:border-black hover:bg-zinc-50"><AlertTriangle className="h-4 w-4 text-zinc-500" /><span>{item.label}</span><ArrowUpRight className="ml-auto h-4 w-4 text-zinc-400" /></Link>)}</CardContent></Card>
      </section>

      <Card className="border-zinc-300 bg-white shadow-sm"><CardHeader className="border-b border-zinc-200 p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-black">Recent Employees</h2><p className="mt-1 text-xs text-zinc-500">Latest workforce records</p></div><Link href="/employees" className="flex items-center gap-1 text-xs font-semibold text-black hover:underline">View all <ArrowUpRight className="h-3.5 w-3.5" /></Link></div></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow className="border-zinc-200 bg-zinc-50"><TableHead className="text-zinc-600">Employee</TableHead><TableHead className="text-zinc-600">Position</TableHead><TableHead className="text-zinc-600">Department</TableHead></TableRow></TableHeader><TableBody>{recentEmployees.map((employee) => <TableRow key={employee.name} className="border-zinc-200"><TableCell><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-black text-xs font-semibold text-white">{initials(employee.name)}</span><span className="font-medium text-black">{employee.name}</span></div></TableCell><TableCell className="text-zinc-600">{employee.title}</TableCell><TableCell className="text-zinc-600">{employee.department}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
    </main>
  )
}
