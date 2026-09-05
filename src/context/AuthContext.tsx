"use client"

import React, { createContext, useContext, useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/src/lib/api"
import type { UserRole } from "@/src/lib/rbac"

export type AuthOrganization = {
  id: string
  name: string
  slug: string
  currency: string
}

/** The employee record this login owns, when one is linked. */
export type AuthEmployee = {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  jobTitle: string
}

export type AuthUser = {
  id: string
  name: string
  email: string
  role: UserRole
  status: "invited" | "active" | "inactive" | "suspended"
  /** True until an admin-issued temporary password has been replaced. */
  mustChangePassword?: boolean
  organization?: AuthOrganization | null
  employee?: AuthEmployee | null
}

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: { email: string; password: string }) => Promise<AuthUser>
  logout: () => Promise<void>
  refreshUser: () => Promise<AuthUser | null>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()

  async function refreshUser() {
    try {
      return await apiRequest<AuthUser>("/api/auth/me")
    } catch {
      return null
    }
  }

  const authQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: refreshUser,
    retry: false,
  })

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      return apiRequest<AuthUser>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["auth", "me"], data)
    },
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/auth/logout", {
        method: "POST",
      })
    },
    onSuccess: () => {
      queryClient.setQueryData(["auth", "me"], null)
      queryClient.removeQueries({ queryKey: ["auth", "me"] })
    },
  })

  const user = authQuery.data ?? null

  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated: Boolean(user),
    isLoading: authQuery.isLoading,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    refreshUser: async () => {
      const result = await authQuery.refetch()
      return result.data ?? null
    },
  }), [authQuery, loginMutation.mutateAsync, logoutMutation.mutateAsync, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    return {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: async () => {
        throw new Error("Auth provider is not mounted")
      },
      logout: async () => {},
      refreshUser: async () => null,
    }
  }
  return context
}
