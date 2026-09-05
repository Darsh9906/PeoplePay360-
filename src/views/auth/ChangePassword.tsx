"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { KeyRound, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-zinc-300 bg-white p-8 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black">
            <KeyRound className="h-5 w-5 text-white" />
          </div>

          <h1 className="mt-4 text-xl font-bold tracking-tight text-black">
            {forced ? "Choose your password" : "Change your password"}
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600">
            {forced
              ? "Your account was created with a temporary password. Pick your own to continue."
              : "Your other signed-in devices will be signed out."}
          </p>

          {user?.email && (
            <p className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-600">
              {user.email}
            </p>
          )}

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black" htmlFor="currentPassword">
                {forced ? "Temporary password" : "Current password"}
              </label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(event) => {
                  setCurrentPassword(event.target.value)
                  setErrors((current) => ({ ...current, currentPassword: "" }))
                  setServerError("")
                }}
                autoComplete="current-password"
                autoFocus
              />
              {errors.currentPassword && (
                <p className="text-[11px] font-medium text-black">
                  {errors.currentPassword}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black" htmlFor="newPassword">
                New password
              </label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value)
                  setErrors((current) => ({ ...current, newPassword: "" }))
                }}
                autoComplete="new-password"
              />
              {errors.newPassword ? (
                <p className="text-[11px] font-medium text-black">{errors.newPassword}</p>
              ) : (
                <p className="text-[11px] text-zinc-500">At least 8 characters.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black" htmlFor="confirmPassword">
                Confirm new password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value)
                  setErrors((current) => ({ ...current, confirmPassword: "" }))
                }}
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p className="text-[11px] font-medium text-black">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {serverError && (
              <div className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-medium text-black">
                {serverError}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={changeMutation.isPending}>
              {changeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save password and continue"
              )}
            </Button>
          </form>
        </div>

        <button
          type="button"
          onClick={async () => {
            await logout()
            router.replace("/login")
          }}
          className="mx-auto mt-5 block text-xs text-zinc-500 transition hover:text-black"
        >
          Sign out instead
        </button>
      </div>
    </main>
  )
}
