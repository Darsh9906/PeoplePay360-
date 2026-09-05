"use client"

import React, { createContext, useContext, useState } from "react"

type AuthUser = {
  id?: string
  name?: string
  email?: string
  role?: string
}

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (user: AuthUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)

  const value = {
    user,
    isAuthenticated: Boolean(user),
    login: setUser,
    logout: () => setUser(null),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    return {
      user: null,
      isAuthenticated: false,
      login: () => {},
      logout: () => {},
    }
  }
  return context
}
