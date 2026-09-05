"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/src/context/AuthContext"

export default function Login() {
  const router = useRouter()
  const { isAuthenticated, login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isAuthenticated) router.replace("/")
  }, [isAuthenticated, router])

  const handleSubmit = (event) => {
    event.preventDefault()
    setError("")

    if (!email.trim() || !password) {
      setError("Enter your work email and password to continue.")
      return
    }

    setIsSubmitting(true)
    login({
      name: email.split("@")[0],
      email: email.trim(),
      role: "HR Operations",
    })
    router.push("/")
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-300 bg-black text-lg font-bold text-white">
            P
          </div>
          <p className="text-sm font-semibold tracking-wide text-black">PeoplePay360</p>
          <p className="mt-1 text-xs text-zinc-500">Intelligent Payroll Operations</p>
        </div>

        <Card className="border-zinc-300 bg-white text-black shadow-xl shadow-zinc-200/60">
          <CardHeader className="space-y-2 border-b border-zinc-200 p-6">
            <h1 className="text-xl font-semibold tracking-tight text-black">Welcome back</h1>
            <p className="text-sm text-zinc-500">Sign in to access your HR operations workspace.</p>
          </CardHeader>
          <CardContent className="p-6">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-700" htmlFor="work-email">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    id="work-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="border-zinc-300 bg-white pl-10 text-black placeholder:text-zinc-400 focus-visible:ring-black"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-700" htmlFor="password">
                    Password
                  </label>
                  <button className="text-xs text-zinc-500 transition hover:text-black" type="button">
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="border-zinc-300 bg-white px-10 text-black placeholder:text-zinc-400 focus-visible:ring-black"
                  />
                  <button
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-black"
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">{error}</p>}

              <Button className="h-10 w-full bg-black text-white hover:bg-zinc-800" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Signing in..." : "Sign In"}
                {!isSubmitting && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-zinc-500">PeoplePay360 Workspace · Secure access</p>
      </div>
    </main>
  )
}
