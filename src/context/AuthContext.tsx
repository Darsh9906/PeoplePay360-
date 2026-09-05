"use client"

import React, { createContext, useContext, useState } from "react"

interface AuthContextType {
  user: any
  isAuthenticated: boolean
  login: (user: any) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)

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
