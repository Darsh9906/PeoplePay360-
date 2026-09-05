"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { apiRequest } from "@/src/lib/api"

type SignupState = {
  signupOpen: boolean
  organization: { name: string } | null
}

const companySizes = ["1–10", "11–50", "51–200", "201–500", "500+"]

const industries = [
  "Software & IT",
  "Manufacturing",
  "Retail",
  "Financial services",
  "Healthcare",
  "Education",
  "Logistics",
  "Other",
]

const emptyForm = {
  companyName: "",
  fullName: "",
  workEmail: "",
  password: "",
  confirmPassword: "",
  companySize: companySizes[1],
  industry: industries[0],
}

export default function Signup() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")

  const domain = form.workEmail.includes("@")
    ? form.workEmail.split("@")[1].toLowerCase().trim()
    : ""

  // Warn as soon as we can tell this company already has a workspace.
  const workspaceQuery = useQuery({
    queryKey: ["signup-state", domain],
    enabled: domain.includes("."),
    queryFn: () =>
      apiRequest<SignupState>(`/api/auth/signup?domain=${encodeURIComponent(domain)}`),
    retry: false,
  })

  const existingWorkspace = workspaceQuery.data?.signupOpen === false
    ? workspaceQuery.data.organization
    : null

  const signupMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          companyName: form.companyName,
          fullName: form.fullName,
          workEmail: form.workEmail,
          password: form.password,
          companySize: form.companySize,
          industry: form.industry,
        }),
      }),
    onSuccess: async () => {
      // Signup signs the admin in, so refresh the session then land on the app.
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] })
      router.replace("/dashboard")
    },
    onError: (error: Error) => setServerError(error.message),
  })

  function update(field: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: "" }))
    setServerError("")
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const next: Record<string, string> = {}

    if (form.companyName.trim().length < 2) next.companyName = "Company name is required"
    if (form.fullName.trim().length < 2) next.fullName = "Your name is required"
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.workEmail)) {
      next.workEmail = "Enter a valid work email"
    }
    if (form.password.length < 8) next.password = "Use at least 8 characters"
    if (form.password !== form.confirmPassword) {
      next.confirmPassword = "Passwords do not match"
    }

    setErrors(next)
    if (Object.keys(next).length > 0) return

    signupMutation.mutate()
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto w-full max-w-lg">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-zinc-600 transition hover:text-black"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>

        <div className="rounded-xl border border-zinc-300 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Create your workspace
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600">
            Sign up with your company email. You become the administrator and can
            add your team afterwards.
          </p>

          <form className="mt-7 space-y-4" onSubmit={submit}>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black" htmlFor="companyName">
                Company name
              </label>
              <Input
                id="companyName"
                value={form.companyName}
                onChange={(event) => update("companyName", event.target.value)}
                placeholder="Acme Manufacturing Pvt Ltd"
                autoComplete="organization"
              />
              {errors.companyName && (
                <p className="text-[11px] font-medium text-black">{errors.companyName}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-black" htmlFor="companySize">
                  Company size
                </label>
                <Select
                  id="companySize"
                  value={form.companySize}
                  onChange={(event) => update("companySize", event.target.value)}
                >
                  {companySizes.map((size) => (
                    <option key={size} value={size}>
                      {size} employees
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-black" htmlFor="industry">
                  Industry
                </label>
                <Select
                  id="industry"
                  value={form.industry}
                  onChange={(event) => update("industry", event.target.value)}
                >
                  {industries.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="h-px bg-zinc-200" />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black" htmlFor="fullName">
                Your full name
              </label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(event) => update("fullName", event.target.value)}
                placeholder="Riya Shah"
                autoComplete="name"
              />
              {errors.fullName && (
                <p className="text-[11px] font-medium text-black">{errors.fullName}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-black" htmlFor="workEmail">
                Work email
              </label>
              <Input
                id="workEmail"
                type="email"
                value={form.workEmail}
                onChange={(event) => update("workEmail", event.target.value)}
                placeholder="riya@acme.com"
                autoComplete="email"
              />
              {errors.workEmail ? (
                <p className="text-[11px] font-medium text-black">{errors.workEmail}</p>
              ) : existingWorkspace ? (
                <p className="text-[11px] font-medium text-black">
                  {existingWorkspace.name} already has a workspace for {domain}.{" "}
                  <Link href="/login" className="underline">
                    Sign in instead
                  </Link>
                  , or ask your administrator to add you.
                </p>
              ) : (
                <p className="text-[11px] text-zinc-500">
                  Use your company domain — personal addresses are not accepted.
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-black" htmlFor="password">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(event) => update("password", event.target.value)}
                  autoComplete="new-password"
                />
                {errors.password && (
                  <p className="text-[11px] font-medium text-black">{errors.password}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold text-black"
                  htmlFor="confirmPassword"
                >
                  Confirm password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(event) => update("confirmPassword", event.target.value)}
                  autoComplete="new-password"
                />
                {errors.confirmPassword && (
                  <p className="text-[11px] font-medium text-black">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            {serverError && (
              <div className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-medium text-black">
                {serverError}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={signupMutation.isPending}
            >
              {signupMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating workspace...
                </>
              ) : (
                "Create workspace"
              )}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-zinc-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-black hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
