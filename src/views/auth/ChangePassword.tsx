"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import AuthSplit from "@/src/components/auth/AuthSplit"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/src/context/AuthContext"
import { apiRequest } from "@/src/lib/api"
import { defaultPathForRole } from "@/src/lib/rbac"

export default function ChangePassword() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, logout } = useAuth()

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")

  const forced = Boolean(user?.mustChangePassword)

  const changeMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/auth/password/change", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] })
      router.replace(defaultPathForRole(user?.role))
    },
    onError: (error: Error) => setServerError(error.message),
  })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const next: Record<string, string> = {}

    if (!currentPassword) {
      next.currentPassword = forced
        ? "Enter the temporary password from your email"
        : "Enter your current password"
    }
    if (newPassword.length < 8) next.newPassword = "Use at least 8 characters"
    if (newPassword === currentPassword && newPassword) {
      next.newPassword = "Choose a password different from your current one"
    }
    if (newPassword !== confirmPassword) {
      next.confirmPassword = "Passwords do not match"
    }

    setErrors(next)
    if (Object.keys(next).length > 0) return

    setServerError("")
    changeMutation.mutate()
  }

  return (
    <AuthSplit
      title={forced ? "Choose your password" : "Change your password"}
      subtitle={
        forced
          ? "Your account was created with a temporary password. Pick your own to continue."
          : "Your other signed-in devices will be signed out."
      }
      footer={
        <button
          type="button"
          onClick={async () => {
            await logout()
            router.replace("/login")
          }}
          className="text-zinc-500 transition-colors hover:text-harbor-800"
        >
          Sign out instead
        </button>
      }
    >
      {user?.email && (
        <p className="mb-5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 font-mono text-xs text-zinc-600">
          {user.email}
        </p>
      )}

      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-zinc-800" htmlFor="currentPassword">
            {forced ? "Temporary password" : "Current password"}
          </label>
          <Input
            id="currentPassword"
            type="password"
            className="h-11"
            value={currentPassword}
            onChange={(event) => {
              setCurrentPassword(event.target.value)
              setErrors((current) => ({ ...current, currentPassword: "" }))
              setServerError("")
            }}
            autoComplete="current-password"
            autoFocus
            aria-invalid={Boolean(errors.currentPassword) || undefined}
          />
          {errors.currentPassword && (
            <p className="text-[11px] font-medium text-danger">{errors.currentPassword}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-zinc-800" htmlFor="newPassword">
            New password
          </label>
          <Input
            id="newPassword"
            type="password"
            className="h-11"
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value)
              setErrors((current) => ({ ...current, newPassword: "" }))
            }}
            autoComplete="new-password"
            aria-invalid={Boolean(errors.newPassword) || undefined}
          />
          {errors.newPassword ? (
            <p className="text-[11px] font-medium text-danger">{errors.newPassword}</p>
          ) : (
            <p className="text-[11px] text-zinc-500">At least 8 characters.</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-zinc-800" htmlFor="confirmPassword">
            Confirm new password
          </label>
          <Input
            id="confirmPassword"
            type="password"
            className="h-11"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value)
              setErrors((current) => ({ ...current, confirmPassword: "" }))
            }}
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword) || undefined}
          />
          {errors.confirmPassword && (
            <p className="text-[11px] font-medium text-danger">{errors.confirmPassword}</p>
          )}
        </div>

        {serverError && (
          <p className="rounded-xl border border-danger/20 bg-danger-soft px-3 py-2.5 text-xs font-medium text-danger">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={changeMutation.isPending}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-harbor-900 to-harbor-600 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(22,69,106,0.95)] transition-all hover:brightness-110 active:translate-y-px disabled:pointer-events-none disabled:opacity-60"
        >
          {changeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {changeMutation.isPending ? "Saving…" : "Save password and continue"}
        </button>
      </form>
    </AuthSplit>
  )
}
