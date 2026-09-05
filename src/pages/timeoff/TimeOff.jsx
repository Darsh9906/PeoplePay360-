"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { AlertCircle, CalendarDays, Check, Eye, Plus, Search, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const defaultLeaveTypes = ["Casual Leave", "Sick Leave", "Earned Leave", "Unpaid Leave"]
const statuses = ["Pending", "Approved", "Rejected", "Cancelled"]

const initialRequests = [
  { id: "TO-001", employeeId: "EMP-1024", employee: "Aarav Mehta", leaveType: "Casual Leave", startDate: "Sep 8, 2026", endDate: "Sep 9, 2026", days: 2, status: "Approved", requestedOn: "Sep 2, 2026" },
  { id: "TO-002", employeeId: "EMP-002", employee: "Riya Shah", leaveType: "Sick Leave", startDate: "Sep 10, 2026", endDate: "Sep 10, 2026", days: 1, status: "Pending", requestedOn: "Sep 5, 2026" },
  { id: "TO-003", employeeId: "EMP-003", employee: "Karan Patel", leaveType: "Earned Leave", startDate: "Sep 15, 2026", endDate: "Sep 18, 2026", days: 4, status: "Approved", requestedOn: "Aug 28, 2026" },
  { id: "TO-004", employeeId: "EMP-004", employee: "Nisha Rao", leaveType: "Casual Leave", startDate: "Sep 20, 2026", endDate: "Sep 21, 2026", days: 2, status: "Pending", requestedOn: "Sep 5, 2026" },
  { id: "TO-005", employeeId: "EMP-005", employee: "Maya Shah", leaveType: "Unpaid Leave", startDate: "Sep 25, 2026", endDate: "Sep 25, 2026", days: 1, status: "Rejected", requestedOn: "Sep 1, 2026" },
]

const emptyForm = { employee: "", leaveType: "Casual Leave", startDate: "", endDate: "", reason: "" }

function statusVariant(status) {
  return status === "Approved" ? "active" : status === "Pending" ? "expiring" : status === "Rejected" ? "inactive" : "outline"
}

export default function TimeOff() {
  const [requests, setRequests] = useState(initialRequests)
  const [customLeaveTypes, setCustomLeaveTypes] = useState([])
  const [search, setSearch] = useState("")
  const [leaveType, setLeaveType] = useState("All leave types")
  const [status, setStatus] = useState("All statuses")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [isAddingLeaveType, setIsAddingLeaveType] = useState(false)
  const [newLeaveType, setNewLeaveType] = useState("")

  const leaveTypes = [...defaultLeaveTypes, ...customLeaveTypes]

  const pendingCount = requests.filter((request) => request.status === "Pending").length
  const filteredRequests = useMemo(() => requests.filter((request) => {
    const query = search.trim().toLowerCase()
    return (!query || request.employee.toLowerCase().includes(query) || request.leaveType.toLowerCase().includes(query)) &&
      (leaveType === "All leave types" || request.leaveType === leaveType) &&
      (status === "All statuses" || request.status === status)
  }), [leaveType, requests, search, status])

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: "" }))
  }

  const openRequestForm = () => {
    setForm(emptyForm)
    setErrors({})
    setIsAddingLeaveType(false)
    setNewLeaveType("")
    setIsModalOpen(true)
  }

  const addCustomLeaveType = () => {
    const nextLeaveType = newLeaveType.trim()
    if (!nextLeaveType || leaveTypes.includes(nextLeaveType)) return
    setCustomLeaveTypes((current) => [...current, nextLeaveType])
    updateForm("leaveType", nextLeaveType)
    setNewLeaveType("")
    setIsAddingLeaveType(false)
  }

  const submitRequest = (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!form.employee.trim()) nextErrors.employee = "Employee is required."
    if (!form.leaveType) nextErrors.leaveType = "Leave type is required."
    if (!form.startDate) nextErrors.startDate = "Start date is required."
    if (!form.endDate) nextErrors.endDate = "End date is required."
    if (form.startDate && form.endDate && form.endDate < form.startDate) nextErrors.endDate = "End date cannot be before start date."
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setRequests((current) => [{ id: `TO-${String(current.length + 1).padStart(3, "0")}`, employeeId: "EMP-NEW", employee: form.employee.trim(), leaveType: form.leaveType, startDate: form.startDate, endDate: form.endDate, days: 1, status: "Pending", requestedOn: "Sep 5, 2026" }, ...current])
    setIsModalOpen(false)
    setForm(emptyForm)
  }

  const updateStatus = (id, nextStatus) => setRequests((current) => current.map((request) => request.id === id ? { ...request, status: nextStatus } : request))

  return (
    <main className="min-h-[calc(100vh-8rem)] space-y-5 rounded-xl bg-white p-5 text-black sm:p-6">
      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-semibold tracking-tight">Time Off</h1><p className="mt-1 text-sm text-zinc-500">Manage employee leave requests and time-off balances.</p></div><Button className="bg-black text-white hover:bg-zinc-800" onClick={openRequestForm}><Plus className="h-4 w-4" /> Request Time Off</Button></header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[{ label: "Pending Requests", value: pendingCount, icon: AlertCircle }, { label: "Approved This Month", value: 24, icon: Check }, { label: "Employees On Leave", value: 6, icon: CalendarDays }, { label: "Total Leave Days", value: 42, icon: CalendarDays }].map(({ label, value, icon: Icon }) => <Card key={label} className="border-zinc-300 bg-white text-black shadow-sm"><CardContent className="flex items-start justify-between p-5"><div><p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p></div><Icon className="h-4 w-4 text-zinc-400" /></CardContent></Card>)}</section>

      <Card className="border-zinc-200 bg-zinc-50 shadow-sm"><CardContent className="flex flex-col gap-3 p-3 md:flex-row"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee or leave type" className="border-zinc-300 bg-white pl-9 text-black placeholder:text-zinc-400 focus-visible:ring-black" /></div><Select value={leaveType} onChange={(event) => setLeaveType(event.target.value)} className="border-zinc-300 bg-white text-black md:w-48"><option>All leave types</option>{leaveTypes.map((type) => <option key={type}>{type}</option>)}</Select><Select value={status} onChange={(event) => setStatus(event.target.value)} className="border-zinc-300 bg-white text-black md:w-40"><option>All statuses</option>{statuses.map((item) => <option key={item}>{item}</option>)}</Select></CardContent></Card>

      <Card className="overflow-hidden border-zinc-200 bg-white text-black shadow-sm"><CardHeader className="border-b border-zinc-200 p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Time Off Requests</h2><p className="mt-1 text-xs text-zinc-500">Review and manage employee leave activity.</p></div><Badge variant="outline">{filteredRequests.length} requests</Badge></div></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow className="border-zinc-200 bg-zinc-50 hover:bg-zinc-50"><TableHead className="text-zinc-600">Employee</TableHead><TableHead className="text-zinc-600">Leave Type</TableHead><TableHead className="text-zinc-600">Start Date</TableHead><TableHead className="text-zinc-600">End Date</TableHead><TableHead className="text-zinc-600">Days</TableHead><TableHead className="text-zinc-600">Status</TableHead><TableHead className="text-zinc-600">Requested On</TableHead><TableHead /></TableRow></TableHeader><TableBody>{filteredRequests.length ? filteredRequests.map((request) => <TableRow key={request.id} className="border-zinc-200 text-zinc-600 hover:bg-zinc-50"><TableCell><Link href={`/employees/${request.employeeId}`} className="font-medium text-black hover:underline">{request.employee}</Link></TableCell><TableCell>{request.leaveType}</TableCell><TableCell>{request.startDate}</TableCell><TableCell>{request.endDate}</TableCell><TableCell>{request.days}</TableCell><TableCell><Badge variant={statusVariant(request.status)}>{request.status}</Badge></TableCell><TableCell className="text-zinc-500">{request.requestedOn}</TableCell><TableCell><div className="flex items-center justify-end gap-1">{request.status === "Pending" && <><Button size="sm" className="h-7 bg-black px-2 text-white hover:bg-zinc-800" onClick={() => updateStatus(request.id, "Approved")}><Check className="h-3 w-3" /> Approve</Button><Button size="sm" variant="outline" className="h-7 border-zinc-300 bg-white px-2 text-black hover:bg-zinc-100" onClick={() => updateStatus(request.id, "Rejected")}><X className="h-3 w-3" /> Reject</Button></>}<Button size="icon-sm" variant="ghost" className="text-zinc-500 hover:bg-zinc-100 hover:text-black" onClick={() => setViewing(request)} aria-label={`View ${request.employee} request`}><Eye className="h-4 w-4" /></Button></div></TableCell></TableRow>) : <TableRow className="border-zinc-200 hover:bg-white"><TableCell colSpan={8} className="h-56 text-center"><div className="flex flex-col items-center gap-2 text-zinc-500"><CalendarDays className="h-9 w-9 text-zinc-300" /><p className="font-medium text-black">No time-off requests found.</p><p className="text-xs">Try changing your search or filters.</p></div></TableCell></TableRow>}</TableBody></Table></CardContent></Card>

      <Card className="border-zinc-200 bg-zinc-50 text-black shadow-sm"><CardContent className="flex items-start gap-3 p-5"><AlertCircle className="mt-0.5 h-4 w-4 text-zinc-500" /><div><h2 className="text-sm font-semibold">Payroll Impact</h2><p className="mt-1 text-xs leading-5 text-zinc-500">Approved time off can be considered as part of the employee&apos;s payroll context. No payroll calculations are performed here.</p></div></CardContent></Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}><DialogHeader><DialogTitle>Request Time Off</DialogTitle><DialogDescription>Submit a frontend-only leave request for review.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={submitRequest}><div className="space-y-1.5"><label className="text-xs font-semibold text-black" htmlFor="timeoff-employee">Employee</label><Input id="timeoff-employee" value={form.employee} onChange={(event) => updateForm("employee", event.target.value)} placeholder="Employee name" />{errors.employee && <p className="text-xs text-black">{errors.employee}</p>}</div><div className="space-y-1.5"><label className="text-xs font-semibold text-black" htmlFor="timeoff-type">Leave Type</label><Select id="timeoff-type" value={form.leaveType} onChange={(event) => { if (event.target.value === "__add_custom__") { setIsAddingLeaveType(true); updateForm("leaveType", "") } else updateForm("leaveType", event.target.value) }}><option value="">Select leave type</option>{leaveTypes.map((type) => <option key={type}>{type}</option>)}<option value="__add_custom__">+ Add custom leave type</option></Select>{isAddingLeaveType && <div className="flex gap-2"><Input autoFocus value={newLeaveType} onChange={(event) => setNewLeaveType(event.target.value)} placeholder="e.g. Parental Leave" /><Button type="button" size="sm" onClick={addCustomLeaveType}>Add</Button></div>}{errors.leaveType && <p className="text-xs text-black">{errors.leaveType}</p>}</div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><label className="text-xs font-semibold text-black" htmlFor="timeoff-start">Start Date</label><Input id="timeoff-start" type="date" value={form.startDate} onChange={(event) => updateForm("startDate", event.target.value)} />{errors.startDate && <p className="text-xs text-black">{errors.startDate}</p>}</div><div className="space-y-1.5"><label className="text-xs font-semibold text-black" htmlFor="timeoff-end">End Date</label><Input id="timeoff-end" type="date" value={form.endDate} onChange={(event) => updateForm("endDate", event.target.value)} />{errors.endDate && <p className="text-xs text-black">{errors.endDate}</p>}</div></div><div className="space-y-1.5"><label className="text-xs font-semibold text-black" htmlFor="timeoff-reason">Reason</label><textarea id="timeoff-reason" value={form.reason} onChange={(event) => updateForm("reason", event.target.value)} placeholder="Add a short reason" className="min-h-20 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black placeholder:text-zinc-400 outline-none focus:ring-1 focus:ring-black" /></div><DialogFooter><Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button type="submit">Submit Request</Button></DialogFooter></form></Dialog>

      <Dialog open={Boolean(viewing)} onOpenChange={() => setViewing(null)}><DialogHeader><DialogTitle>Time Off Request</DialogTitle><DialogDescription>Frontend presentation details.</DialogDescription></DialogHeader>{viewing && <div className="space-y-3 text-sm"><div className="flex justify-between border-b border-zinc-200 pb-2"><span className="text-zinc-500">Employee</span><strong>{viewing.employee}</strong></div><div className="flex justify-between border-b border-zinc-200 pb-2"><span className="text-zinc-500">Leave Type</span><strong>{viewing.leaveType}</strong></div><div className="flex justify-between border-b border-zinc-200 pb-2"><span className="text-zinc-500">Period</span><strong>{viewing.startDate} - {viewing.endDate}</strong></div><div className="flex justify-between"><span className="text-zinc-500">Status</span><Badge variant={statusVariant(viewing.status)}>{viewing.status}</Badge></div></div>}<DialogFooter><Button onClick={() => setViewing(null)}>Close</Button></DialogFooter></Dialog>
    </main>
  )
}
