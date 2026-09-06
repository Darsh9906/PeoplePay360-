"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Check, LogOut, Menu, UserRound, X } from "lucide-react"
import { useApp } from "@/src/context/AppContext"
import { useAuth } from "@/src/context/AuthContext"
import { labelForPath, labelForRole } from "@/src/lib/rbac"
import { apiRequest } from "@/src/lib/api"

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname() ?? "/"
  const app = useApp()
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()

  const [profileOpen, setProfileOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: "", email: "", password: "" })
  const [profileMessage, setProfileMessage] = useState("")
  const menuRef = useRef<HTMLDivElement>(null)

  const sidebarOpen = app?.sidebarOpen ?? true
  const setSidebarOpen = app?.setSidebarOpen ?? (() => {})

  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"

  // Clicking anywhere outside closes the profile panel.
  useEffect(() => {
    if (!profileOpen) return

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false)
    }

    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [profileOpen])

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  const openProfile = () => {
    setProfileForm({ name: user?.name ?? "", email: user?.email ?? "", password: "" })
    setProfileMessage("")
    setEditingProfile(false)
    setProfileOpen((value) => !value)
  }

  const saveProfile = async () => {
    if (!user) return
    try {
      const payload = {
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
        ...(profileForm.password ? { password: profileForm.password } : {}),
      }
      const updated = await apiRequest<typeof user>(`/api/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
      queryClient.setQueryData(["auth", "me"], updated)
      setProfileMessage("Profile updated.")
      setEditingProfile(false)
    } catch (error) {
      setProfileMessage(
        error instanceof Error ? error.message : "Unable to update profile.",
      )
    }
  }

  return (
    <header
      className={`sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/85 px-4 backdrop-blur-md transition-all duration-300 sm:px-6 ${
        sidebarOpen ? "lg:ml-64" : "lg:ml-20"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 transition hover:bg-harbor-50 hover:text-harbor-800 lg:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            HR Operations
          </p>
          <h2 className="truncate font-display text-[15px] font-semibold tracking-[-0.015em] text-zinc-900">
            {labelForPath(pathname)}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleLogout}
          className="flex h-9 items-center gap-2 rounded-xl border border-zinc-200 px-3 text-xs font-semibold text-zinc-600 transition hover:border-danger/30 hover:bg-danger-soft hover:text-danger"
          type="button"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Log out</span>
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={openProfile}
            aria-expanded={profileOpen}
            className="flex items-center gap-2.5 rounded-xl border border-transparent p-1 pr-2 text-left transition hover:border-zinc-200 hover:bg-zinc-50 aria-expanded:border-zinc-200 aria-expanded:bg-zinc-50"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-harbor-800 text-[11px] font-bold text-white">
              {initials}
            </span>
            <span className="hidden flex-col sm:flex">
              <span className="text-xs font-semibold leading-tight text-zinc-900">
                {user?.name ?? "User"}
              </span>
              <span className="text-[10px] leading-tight text-zinc-500">
                {labelForRole(user?.role)}
              </span>
            </span>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-zinc-200 bg-white p-4 shadow-float">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="font-display text-sm font-semibold text-zinc-900">
                    My profile
                  </p>
                  <p className="text-xs text-zinc-500">Update your account details</p>
                </div>
                <button
                  type="button"
                  onClick={() => setProfileOpen(false)}
                  aria-label="Close profile"
                  className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {editingProfile ? (
                <div className="space-y-3">
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Name
                    <input
                      value={profileForm.name}
                      onChange={(event) =>
                        setProfileForm({ ...profileForm, name: event.target.value })
                      }
                      className="mt-1.5 h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm font-normal normal-case tracking-normal text-zinc-900 focus:border-harbor-400 focus:outline-none focus:ring-2 focus:ring-harbor-400/25"
                    />
                  </label>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Email
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(event) =>
                        setProfileForm({ ...profileForm, email: event.target.value })
                      }
                      className="mt-1.5 h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm font-normal normal-case tracking-normal text-zinc-900 focus:border-harbor-400 focus:outline-none focus:ring-2 focus:ring-harbor-400/25"
                    />
                  </label>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    New password
                    <input
                      type="password"
                      minLength={8}
                      value={profileForm.password}
                      onChange={(event) =>
                        setProfileForm({ ...profileForm, password: event.target.value })
                      }
                      placeholder="Leave blank to keep current"
                      className="mt-1.5 h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm font-normal normal-case tracking-normal text-zinc-900 placeholder:text-zinc-400 focus:border-harbor-400 focus:outline-none focus:ring-2 focus:ring-harbor-400/25"
                    />
                  </label>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={saveProfile}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-harbor-800 px-3.5 text-xs font-semibold text-white transition hover:bg-harbor-900"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Save changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingProfile(false)}
                      className="h-9 rounded-xl border border-zinc-200 px-3.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-harbor-800 text-xs font-bold text-white">
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900">
                        {user?.name}
                      </p>
                      <p className="truncate text-xs text-zinc-500">{user?.email}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-zinc-500">
                    Role ·{" "}
                    <span className="font-semibold text-harbor-700">
                      {labelForRole(user?.role)}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setEditingProfile(true)}
                    className="mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 transition hover:border-harbor-200 hover:bg-harbor-50 hover:text-harbor-800"
                  >
                    <UserRound className="h-3.5 w-3.5" />
                    Edit profile
                  </button>
                </div>
              )}

              {profileMessage && (
                <p className="mt-3 rounded-lg bg-harbor-50 px-3 py-2 text-xs text-harbor-800">
                  {profileMessage}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
