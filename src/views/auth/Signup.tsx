"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import AuthSplit from "@/src/components/auth/AuthSplit"
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

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[13px] font-medium text-zinc-800" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[11px] font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="text-[11px] leading-relaxed text-zinc-500">{hint}</p>
      ) : null}
    </div>
  )
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
    <AuthSplit
      title="Get started"
      subtitle="Let's create your company workspace"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-harbor-800 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form className="space-y-3.5" onSubmit={submit}>
        <Field label="Company name" htmlFor="companyName" error={errors.companyName}>
          <Input
            className="h-11"
            id="companyName"
            value={form.companyName}
            onChange={(event) => update("companyName", event.target.value)}
            placeholder="Acme Manufacturing Pvt Ltd"
            autoComplete="organization"
            aria-invalid={Boolean(errors.companyName) || undefined}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company size" htmlFor="companySize">
            <Select
              className="h-11"
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
          </Field>

          <Field label="Industry" htmlFor="industry">
            <Select
              className="h-11"
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
          </Field>
        </div>

        <div className="h-px bg-zinc-100" />

        <Field label="Your full name" htmlFor="fullName" error={errors.fullName}>
          <Input
            className="h-11"
            id="fullName"
            value={form.fullName}
            onChange={(event) => update("fullName", event.target.value)}
            placeholder="Riya Shah"
            autoComplete="name"
            aria-invalid={Boolean(errors.fullName) || undefined}
          />
        </Field>

        <Field
          label="Work email"
          htmlFor="workEmail"
          error={errors.workEmail}
          hint={
            existingWorkspace ? (
              <span className="text-warning">
                {existingWorkspace.name} already has a workspace for {domain}.{" "}
                <Link href="/login" className="font-semibold underline">
                  Sign in instead
                </Link>
                , or ask your administrator to add you.
              </span>
            ) : (
              "Use your company domain — personal addresses are not accepted."
            )
          }
        >
          <Input
            className="h-11"
            id="workEmail"
            type="email"
            value={form.workEmail}
            onChange={(event) => update("workEmail", event.target.value)}
            placeholder="riya@acme.com"
            autoComplete="email"
            aria-invalid={Boolean(errors.workEmail) || undefined}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" htmlFor="password" error={errors.password}>
            <Input
              className="h-11"
              id="password"
              type="password"
              value={form.password}
              onChange={(event) => update("password", event.target.value)}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password) || undefined}
            />
          </Field>

          <Field
            label="Confirm password"
            htmlFor="confirmPassword"
            error={errors.confirmPassword}
          >
            <Input
              className="h-11"
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={(event) => update("confirmPassword", event.target.value)}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirmPassword) || undefined}
            />
          </Field>
        </div>

        {serverError && (
          <p className="rounded-xl border border-danger/20 bg-danger-soft px-3 py-2.5 text-xs font-medium text-danger">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={signupMutation.isPending}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-harbor-900 to-harbor-600 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(22,69,106,0.95)] transition-all hover:brightness-110 active:translate-y-px disabled:pointer-events-none disabled:opacity-60"
        >
          {signupMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {signupMutation.isPending ? "Creating workspace…" : "Sign up"}
        </button>
      </form>
    </AuthSplit>
  )
}
