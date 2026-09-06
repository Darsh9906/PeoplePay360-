"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import AuthSplit from "@/src/components/auth/AuthSplit"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/src/context/AuthContext"
import { defaultPathForRole } from "@/src/lib/rbac"

export default function Login() {
  const router = useRouter()
  const { isAuthenticated, isLoading, login, user } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return
    router.replace(
      user?.mustChangePassword ? "/change-password" : defaultPathForRole(user?.role),
    )
  }, [isAuthenticated, router, user?.mustChangePassword, user?.role])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError("")

    if (!email.trim() || !password) {
      setError("Enter your work email and password to continue.")
      return
    }

    setIsSubmitting(true)
    try {
      const loggedInUser = await login({ email: email.trim(), password })
      // A temporary password is only good for reaching the change screen.
      router.push(
        loggedInUser.mustChangePassword
          ? "/change-password"
          : defaultPathForRole(loggedInUser.role),
      )
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to sign in.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const busy = isSubmitting || isLoading

  return (
    <AuthSplit
      title="Welcome back"
      subtitle="Sign in to your HR operations workspace"
      footer={
        <>
          New company?{" "}
          <Link href="/signup" className="font-semibold text-harbor-800 hover:underline">
            Create a workspace
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-[13px] font-medium text-zinc-800" htmlFor="work-email">
            Email
          </label>
          <Input
            id="work-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <label className="text-[13px] font-medium text-zinc-800" htmlFor="password">
              Password
            </label>
            <span
              className="text-[13px] text-zinc-400"
              title="Ask your workspace administrator to reset it"
            >
              Forgot? Ask your admin
            </span>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 pr-11"
            />
            <button
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-zinc-400 transition-colors hover:text-harbor-700"
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-danger/20 bg-danger-soft px-3 py-2.5 text-xs font-medium text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-harbor-900 to-harbor-600 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(22,69,106,0.95)] transition-all hover:brightness-110 active:translate-y-px disabled:pointer-events-none disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthSplit>
  )
}
