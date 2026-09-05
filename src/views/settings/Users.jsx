"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/src/lib/api"
import { useAuth } from "@/src/context/AuthContext"
import { Check, ChevronRight, KeyRound, Plus, Search, UserRound, X } from "lucide-react"
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

const roles = [
  { label: "Admin", value: "admin" },
  { label: "HR Manager", value: "hr_manager" },
  { label: "Payroll Manager", value: "payroll_manager" },
  { label: "Payroll User", value: "payroll_user" },
  { label: "Employee", value: "employee" },
]

const statuses = [
  { label: "Invited", value: "invited" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Suspended", value: "suspended" },
]

const emptyForm = { name: "", email: "", role: "employee", status: "active" }

function roleLabel(value) {
  return roles.find((role) => role.value === value)?.label ?? value
}

function statusLabel(value) {
  return statuses.find((status) => status.value === value)?.label ?? value
}

function initials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export default function Users() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const [selectedId, setSelectedId] = useState(null)
  const [formVisible, setFormVisible] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("All roles")
  const [tempPassword, setTempPassword] = useState(null)
  const [copied, setCopied] = useState("")

  const copyToClipboard = async (value, field) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(field)
      setTimeout(() => setCopied(""), 1500)
    } catch {
      // Clipboard access can be blocked; the value is selectable as a fallback.
    }
  }
  const [errors, setErrors] = useState({})
  const [feedback, setFeedback] = useState("")
  const organizationDomain = currentUser?.email?.split("@")[1] ?? "your company domain"

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => apiRequest("/api/users"),
  })

  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data])

  const resetPasswordMutation = useMutation({
    mutationFn: (user) =>
      apiRequest(`/api/users/${user.id}/reset-password`, { method: "POST" }),
    onSuccess: (result) => {
      setFormVisible(false)
      setFeedback("")
      setErrors({})
      setTempPassword({
        name: result.name,
        email: result.email,
        password: result.tempPassword,
        reset: true,
      })
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
    onError: (error) =>
      setErrors({ form: error instanceof Error ? error.message : "Could not reset the password." }),
  })

  const saveUserMutation = useMutation({
    mutationFn: ({ id, payload }) => {
      if (id) {
        return apiRequest(`/api/users/${id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      }

      return apiRequest("/api/users", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      queryClient.invalidateQueries({ queryKey: ["employees"] })
    },
  })

  const selectedUser = users.find((user) => user.id === selectedId)
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return users.filter((user) => {
      const values = [user.name, user.email].filter(Boolean)
      const matchesSearch = !query || values.some((value) => value.toLowerCase().includes(query))
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
    setTempPassword(null)
  }

  const selectUser = (user) => {
    setFormVisible(true)
    setSelectedId(user.id)
    setForm({
      name: user.name ?? "",
      email: user.email,
      role: user.role,
      status: user.status,
    })
    setErrors({})
    setFeedback("")
    setTempPassword(null)
  }

  const closeForm = () => {
    setFormVisible(false)
    setSelectedId(null)
    setForm(emptyForm)
    setErrors({})
    setFeedback("")
    setTempPassword(null)
  }

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: "" }))
    setFeedback("")
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!form.name.trim()) nextErrors.name = "Full name is required."
    if (!form.email.trim()) nextErrors.email = "Work email is required."
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = "Enter a valid work email."
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return


    try {
      const result = await saveUserMutation.mutateAsync({
        id: selectedId,
        payload: {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          status: form.status,
        },
      })

      if (selectedId) {
        setFeedback("User access updated.")
      } else if (result?.tempPassword) {
        setTempPassword({
          name: form.name.trim(),
          email: form.email.trim(),
          password: result.tempPassword,
          reset: false,
        })
        setFeedback("")
      }

      setSelectedId(null)
      setForm(emptyForm)
    } catch (error) {
      setFeedback("")
      setErrors({
        form: error instanceof Error ? error.message : "Unable to save user access.",
      })
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
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users by name or email" className="border-zinc-300 bg-white pl-9 text-black placeholder:text-zinc-400 focus-visible:ring-black" />
            </div>
            <Select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="w-full border-zinc-300 bg-white text-black sm:w-44">
              <option>All roles</option>
              {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </Select>
          </div>

          {usersQuery.isLoading && (
            <p className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500">
              Loading user access data...
            </p>
          )}

          {(usersQuery.error || errors.form) && (
            <p className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700">
              {errors.form || "Could not load user management data."}
            </p>
          )}

          <Card className="overflow-hidden border-zinc-200 bg-white text-black shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-200 bg-zinc-50 hover:bg-zinc-50">
                    <TableHead className="text-zinc-600">User</TableHead>
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
                      <TableCell className="text-zinc-600">{user.email}</TableCell>
                      <TableCell><Badge className="border-zinc-300 bg-zinc-100 text-zinc-700">{roleLabel(user.role)}</Badge></TableCell>
                      <TableCell><Badge className={user.status === "active" ? "border-black bg-black text-white" : "border-zinc-300 bg-zinc-100 text-zinc-500"}>{statusLabel(user.status)}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-xs"
                            title="Issue a new temporary password"
                            onClick={(event) => {
                              event.stopPropagation()
                              resetPasswordMutation.mutate(user)
                            }}
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            Reset password
                          </Button>
                          <ChevronRight className="h-4 w-4 text-zinc-400" />
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow className="border-zinc-200 hover:bg-white"><TableCell colSpan={5} className="h-56 text-center"><div className="flex flex-col items-center justify-center space-y-2 py-6 text-zinc-500"><UserRound className="h-10 w-10 text-zinc-300" /><p className="text-base font-semibold text-black">No users found</p><p className="max-w-sm text-xs text-zinc-500">There are no user records to display. Use the &quot;New User&quot; button above to add a user.</p></div></TableCell></TableRow>
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
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-700" htmlFor="user-name">Full Name</label>
                <Input
                  id="user-name"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="border-zinc-300 bg-white text-black placeholder:text-zinc-400"
                />
                {errors.name && <p className="text-xs text-zinc-600">{errors.name}</p>}
              </div>
              <div className="space-y-2"><label className="text-xs font-medium text-zinc-700" htmlFor="user-email">Work Email</label><Input id="user-email" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder={`name@${organizationDomain}`} className="border-zinc-300 bg-white text-black placeholder:text-zinc-400 focus-visible:ring-black" />{errors.email ? <p className="text-xs text-zinc-600">{errors.email}</p> : <p className="text-[11px] text-zinc-500">Use an address from {organizationDomain}.</p>}</div>
              <div className="space-y-2"><label className="text-xs font-medium text-zinc-700" htmlFor="user-role">Role</label><Select id="user-role" value={form.role} onChange={(event) => updateField("role", event.target.value)} className="border-zinc-300 bg-white text-black">{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</Select></div>
              <div className="space-y-2"><label className="text-xs font-medium text-zinc-700" htmlFor="user-status">Account Status</label><Select id="user-status" value={form.status} onChange={(event) => updateField("status", event.target.value)} className="border-zinc-300 bg-white text-black">{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</Select></div>
              {feedback && <p className="flex items-center gap-2 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-700"><Check className="h-4 w-4" />{feedback}</p>}
              {tempPassword && (
                <div className="rounded-md border border-black bg-zinc-50 px-3 py-3 text-xs">
                  <p className="font-semibold text-black">
                    {tempPassword.reset
                      ? `New password for ${tempPassword.name}`
                      : `Account created for ${tempPassword.name}`}
                  </p>
                  <p className="mt-1 text-zinc-600">
                    Share these sign-in details. They will be asked to choose
                    their own password the first time they sign in.
                  </p>
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 rounded border border-zinc-300 bg-white px-2 py-1.5">
                      <span className="font-mono text-[12px] text-black">{tempPassword.email}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(tempPassword.email, "email")}
                        className="shrink-0 text-[11px] font-semibold text-zinc-600 hover:text-black"
                      >
                        {copied === "email" ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded border border-zinc-300 bg-white px-2 py-1.5">
                      <span className="select-all font-mono text-[12px] font-semibold text-black">{tempPassword.password}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(tempPassword.password, "password")}
                        className="shrink-0 text-[11px] font-semibold text-zinc-600 hover:text-black"
                      >
                        {copied === "password" ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      Copy it rather than retyping — the password is case-sensitive.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(
                          `Email: ${tempPassword.email}\nPassword: ${tempPassword.password}`,
                          "credentials",
                        )
                      }
                      className="w-full border-zinc-300 bg-white text-xs text-black hover:bg-zinc-100"
                    >
                      {copied === "credentials" ? "Credentials copied" : "Copy credentials"}
                    </Button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTempPassword(null)}
                    className="mt-2 text-[11px] text-zinc-500 hover:text-black"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              <Button className="w-full bg-black text-white hover:bg-zinc-800" disabled={saveUserMutation.isPending} type="submit">{saveUserMutation.isPending ? "Saving..." : selectedUser ? "Save Access" : "Create User"}</Button>
            </form>
          </CardContent>
        </Card>}
      </section>
    </main>
  )
}
