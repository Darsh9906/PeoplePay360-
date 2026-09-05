"use client"

import { useMemo, useState } from "react"
import { Check, ChevronRight, Plus, Search, UserRound, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const roles = ["Admin", "HR Manager", "Payroll Manager", "Employee"]

const employees = [
  { id: "aarav-mehta", name: "Aarav Mehta", email: "aarav.mehta@peoplepay360.com" },
  { id: "maya-shah", name: "Maya Shah", email: "maya.shah@peoplepay360.com" },
  { id: "rohan-patel", name: "Rohan Patel", email: "rohan.patel@peoplepay360.com" },
  { id: "nisha-rao", name: "Nisha Rao", email: "nisha.rao@peoplepay360.com" },
]

const initialUsers = [
  { id: "usr-001", name: "Aarav Mehta", employee: "Aarav Mehta", email: "aarav.mehta@peoplepay360.com", role: "Admin", status: "Active" },
  { id: "usr-002", name: "Maya Shah", employee: "Maya Shah", email: "maya.shah@peoplepay360.com", role: "HR Manager", status: "Active" },
  { id: "usr-003", name: "Rohan Patel", employee: "Rohan Patel", email: "rohan.patel@peoplepay360.com", role: "Payroll Manager", status: "Active" },
  { id: "usr-004", name: "Nisha Rao", employee: "Nisha Rao", email: "nisha.rao@peoplepay360.com", role: "Employee", status: "Inactive" },
]

const emptyForm = { employee: "", email: "", role: "Employee", status: "Active" }

function initials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export default function Users() {
  const [users, setUsers] = useState(initialUsers)
  const [selectedId, setSelectedId] = useState(null)
  const [formVisible, setFormVisible] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("All roles")
  const [errors, setErrors] = useState({})
  const [feedback, setFeedback] = useState("")

  const selectedUser = users.find((user) => user.id === selectedId)
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return users.filter((user) => {
      const matchesSearch = !query || [user.name, user.employee, user.email].some((value) => value.toLowerCase().includes(query))
      const matchesRole = roleFilter === "All roles" || user.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [roleFilter, search, users])

  const openNewUser = () => {
    setFormVisible(true)
    setSelectedId(null)
    setForm(emptyForm)
    setErrors({})
    setFeedback("")
  }

  const selectUser = (user) => {
    setFormVisible(true)
    setSelectedId(user.id)
    setForm({ employee: user.employee, email: user.email, role: user.role, status: user.status })
    setErrors({})
    setFeedback("")
  }

  const closeForm = () => {
    setFormVisible(false)
    setSelectedId(null)
    setForm(emptyForm)
    setErrors({})
    setFeedback("")
  }

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: "" }))
    setFeedback("")
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!form.employee.trim()) nextErrors.employee = "Employee is required."
    if (!form.email.trim()) nextErrors.email = "Work email is required."
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = "Enter a valid work email."
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    if (selectedId) {
      setUsers((current) => current.map((user) => user.id === selectedId ? { ...user, name: form.employee, ...form } : user))
      setFeedback("User access updated.")
    } else {
      setUsers((current) => [{ id: `usr-${Date.now()}`, name: form.employee, employee: form.employee, email: form.email.trim(), role: form.role, status: form.status }, ...current])
      setFeedback(`${form.employee.trim()} was added successfully.`)
      setSelectedId(null)
      setForm(emptyForm)
    }
  }

  return (
    <main className="min-h-[calc(100vh-8rem)] space-y-5 rounded-xl bg-white p-5 text-black sm:p-6">
      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">User Management</h1>
            <Badge className="border-zinc-300 bg-zinc-100 text-[10px] text-zinc-700">ADMIN ONLY</Badge>
          </div>
          <p className="text-sm text-zinc-500">Manage workspace access, roles, and account status.</p>
        </div>
        <Button className="bg-black text-white hover:bg-zinc-800" onClick={openNewUser}>
          <Plus className="h-4 w-4" /> New User
        </Button>
      </header>

      <section className={formVisible ? "grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]" : "block"}>
        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users, employees or email" className="border-zinc-300 bg-white pl-9 text-black placeholder:text-zinc-400 focus-visible:ring-black" />
            </div>
            <Select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="w-full border-zinc-300 bg-white text-black sm:w-44">
              <option>All roles</option>
              {roles.map((role) => <option key={role}>{role}</option>)}
            </Select>
          </div>

          <Card className="overflow-hidden border-zinc-200 bg-white text-black shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-200 bg-zinc-50 hover:bg-zinc-50">
                    <TableHead className="text-zinc-600">User</TableHead>
                    <TableHead className="text-zinc-600">Employee</TableHead>
                    <TableHead className="text-zinc-600">Work Email</TableHead>
                    <TableHead className="text-zinc-600">Role</TableHead>
                    <TableHead className="text-zinc-600">Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                    <TableRow key={user.id} data-state={selectedId === user.id ? "selected" : undefined} className={`cursor-pointer border-zinc-200 text-zinc-600 hover:bg-zinc-50 ${selectedId === user.id ? "bg-zinc-100 ring-1 ring-inset ring-black/20" : "bg-white"}`} onClick={() => selectUser(user)}>
                      <TableCell><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-black text-xs font-semibold text-white">{initials(user.name)}</span><span className="font-medium text-black">{user.name}</span></div></TableCell>
                      <TableCell className="text-zinc-600">{user.employee}</TableCell>
                      <TableCell className="text-zinc-600">{user.email}</TableCell>
                      <TableCell><Badge className="border-zinc-300 bg-zinc-100 text-zinc-700">{user.role}</Badge></TableCell>
                      <TableCell><Badge className={user.status === "Active" ? "border-black bg-black text-white" : "border-zinc-300 bg-zinc-100 text-zinc-500"}>{user.status}</Badge></TableCell>
                      <TableCell className="text-right"><ChevronRight className="ml-auto h-4 w-4 text-zinc-400" /></TableCell>
                    </TableRow>
                  )) : (
                    <TableRow className="border-zinc-200 hover:bg-white"><TableCell colSpan={6} className="h-52 text-center"><div className="flex flex-col items-center gap-2 text-zinc-500"><UserRound className="h-8 w-8 text-zinc-300" /><p className="font-medium text-black">No users found</p><p className="text-xs">Try changing your search or role filter.</p></div></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {formVisible && <Card className="h-fit border-zinc-200 bg-white text-black shadow-sm">
          <CardHeader className="border-b border-zinc-200 p-5">
            <div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-black">{selectedUser ? "Edit User" : "Create User"}</h2><p className="mt-1 text-xs text-zinc-500">{selectedUser ? "Update access for this workspace user." : "Grant a team member access to PeoplePay360."}</p></div><button className="text-zinc-400 hover:text-black" onClick={closeForm} type="button" aria-label="Close user form"><X className="h-4 w-4" /></button></div>
          </CardHeader>
          <CardContent className="p-5">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2"><label className="text-xs font-medium text-zinc-700" htmlFor="user-employee">Employee</label><Input id="user-employee" list="employee-options" value={form.employee} onChange={(event) => updateField("employee", event.target.value)} placeholder="Start typing an employee name" className="border-zinc-300 bg-white text-black placeholder:text-zinc-400 focus-visible:ring-black" /><datalist id="employee-options">{employees.map((employee) => <option key={employee.id} value={employee.name}>{employee.email}</option>)}</datalist>{errors.employee && <p className="text-xs text-zinc-600">{errors.employee}</p>}</div>
              <div className="space-y-2"><label className="text-xs font-medium text-zinc-700" htmlFor="user-email">Work Email</label><Input id="user-email" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="name@company.com" className="border-zinc-300 bg-white text-black placeholder:text-zinc-400 focus-visible:ring-black" />{errors.email && <p className="text-xs text-zinc-600">{errors.email}</p>}</div>
              <div className="space-y-2"><label className="text-xs font-medium text-zinc-700" htmlFor="user-role">Role</label><Select id="user-role" value={form.role} onChange={(event) => updateField("role", event.target.value)} className="border-zinc-300 bg-white text-black">{roles.map((role) => <option key={role}>{role}</option>)}</Select></div>
              <div className="space-y-2"><label className="text-xs font-medium text-zinc-700" htmlFor="user-status">Account Status</label><Select id="user-status" value={form.status} onChange={(event) => updateField("status", event.target.value)} className="border-zinc-300 bg-white text-black"><option>Active</option><option>Inactive</option></Select></div>
              {feedback && <p className="flex items-center gap-2 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-700"><Check className="h-4 w-4" />{feedback}</p>}
              <Button className="w-full bg-black text-white hover:bg-zinc-800" type="submit">{selectedUser ? "Save Access" : "Create User"}</Button>
            </form>
          </CardContent>
        </Card>}
      </section>
    </main>
  )
}
