"use client"

import * as React from "react"

export type UserRole = "buyer" | "seller"

interface UserRoleContextValue {
  role: UserRole
  setRole: (role: UserRole) => void
}

const UserRoleContext = React.createContext<UserRoleContextValue | undefined>(undefined)

export function UserRoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = React.useState<UserRole>("buyer")

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const paramsRole = new URLSearchParams(window.location.search).get("role")
    const stored = window.localStorage.getItem("role")
    const initial = (paramsRole || stored) as UserRole | null
    if (initial === "buyer" || initial === "seller") {
      setRoleState(initial)
      window.localStorage.setItem("role", initial)
    }
  }, [])

  const setRole = React.useCallback((newRole: UserRole) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("role", newRole)
    }
    setRoleState(newRole)
  }, [])

  return (
    <UserRoleContext.Provider value={{ role, setRole }}>
      {children}
    </UserRoleContext.Provider>
  )
}

export function useUserRole() {
  const context = React.useContext(UserRoleContext)
  if (!context) throw new Error("useUserRole must be used within UserRoleProvider")
  return context
}
