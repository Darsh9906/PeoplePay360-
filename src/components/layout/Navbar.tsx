"use client"

import { useApp } from "@/src/context/AppContext"
import { useAuth } from "@/src/context/AuthContext"
import { useQueryClient } from "@tanstack/react-query"
import { labelForRole } from "@/src/lib/rbac"
import { useRouter } from "next/navigation"
import { Menu, LogOut, UserRound, X, Check } from "lucide-react"
import { useState } from "react"

export default function Navbar() {
  const router = useRouter()
  const app = useApp()
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()
  const [profileOpen, setProfileOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: "", email: "", password: "" })
  const [profileMessage, setProfileMessage] = useState("")
  const sidebarOpen = app?.sidebarOpen ?? true
  const setSidebarOpen = app?.setSidebarOpen ?? (() => {})

  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  const openProfile = () => {
    setProfileForm({ name: user?.name ?? "", email: user?.email ?? "", password: "" })
    setProfileMessage("")
    setProfileOpen((value) => !value)
  }

  const saveProfile = async () => {
    if (!user) return
    try {
      const payload = { name: profileForm.name.trim(), email: profileForm.email.trim(), ...(profileForm.password ? { password: profileForm.password } : {}) }
      const updated = await apiRequest<typeof user>(`/api/users/${user.id}`, { method: "PATCH", body: JSON.stringify(payload) })
      queryClient.setQueryData(["auth", "me"], updated)
      setProfileMessage("Profile updated.")
      setEditingProfile(false)
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Unable to update profile.")
    }
  }

  return (
    <header
      className={`sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 sm:px-6 transition-all duration-300 ${
        sidebarOpen ? "lg:ml-64" : "lg:ml-20"
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 hover:text-black hover:bg-zinc-100 transition sm:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-black bg-white border border-zinc-300 px-2 py-1 rounded-sm">
            HR Operations
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleLogout}
          className="flex h-9 items-center gap-2 rounded-md border border-zinc-300 bg-black px-3 text-xs font-semibold text-white transition hover:bg-zinc-800"
          type="button"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>

        <div className="relative border-l border-zinc-200 pl-3">
          <button type="button" onClick={openProfile} className="flex items-center gap-2 rounded-md p-1 text-left hover:bg-zinc-100" aria-expanded={profileOpen}>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-black text-white font-bold text-xs border border-black">
            {initials}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold leading-none text-black">{user?.name ?? "User"}</span>
            <span className="text-[10px] text-zinc-500 leading-tight">
              {labelForRole(user?.role)}
            </span>
          </div>
          </button>
          {profileOpen && <div className="absolute right-0 top-12 z-50 w-72 rounded-md border border-zinc-200 bg-white p-4 shadow-lg"><div className="mb-3 flex items-center justify-between"><div><p className="text-sm font-semibold text-black">My profile</p><p className="text-xs text-zinc-500">Update your account details</p></div><button type="button" onClick={() => setProfileOpen(false)} aria-label="Close profile"><X className="h-4 w-4 text-zinc-400" /></button></div>{editingProfile ? <div className="space-y-3"><label className="block text-xs font-semibold text-zinc-600">Name<input value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} className="mt-1 h-9 w-full rounded-md border border-zinc-300 px-2 text-sm font-normal text-black" /></label><label className="block text-xs font-semibold text-zinc-600">Email<input type="email" value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} className="mt-1 h-9 w-full rounded-md border border-zinc-300 px-2 text-sm font-normal text-black" /></label><label className="block text-xs font-semibold text-zinc-600">New password<input type="password" minLength={8} value={profileForm.password} onChange={(event) => setProfileForm({ ...profileForm, password: event.target.value })} placeholder="Leave blank to keep current" className="mt-1 h-9 w-full rounded-md border border-zinc-300 px-2 text-sm font-normal text-black" /></label><div className="flex gap-2"><button type="button" onClick={saveProfile} className="inline-flex h-8 items-center gap-1 rounded-md bg-black px-3 text-xs font-semibold text-white"><Check className="h-3.5 w-3.5" />Save</button><button type="button" onClick={() => setEditingProfile(false)} className="h-8 rounded-md border border-zinc-300 px-3 text-xs font-semibold text-black">Cancel</button></div></div> : <div><p className="text-sm font-medium text-black">{user?.name}</p><p className="text-xs text-zinc-500">{user?.email}</p><p className="mt-2 text-xs text-zinc-500">{labelForRole(user?.role)}</p><button type="button" onClick={() => setEditingProfile(true)} className="mt-4 inline-flex h-8 items-center gap-1 rounded-md border border-zinc-300 px-3 text-xs font-semibold text-black hover:bg-zinc-100"><UserRound className="h-3.5 w-3.5" />Edit profile</button></div>}{profileMessage && <p className="mt-3 text-xs text-zinc-600">{profileMessage}</p>}</div>}
        </div>
      </div>
    </header>
  )
}
