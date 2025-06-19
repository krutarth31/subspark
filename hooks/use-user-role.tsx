"use client"

import * as React from "react"

export type UserRole = "buyer" | "seller"

interface UserRoleContextValue {
  role: UserRole | null
  setRole: (role: UserRole) => void
}

const UserRoleContext = React.createContext<UserRoleContextValue | undefined>(undefined)

export function UserRoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = React.useState<UserRole | null>(null)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const paramsRole = new URLSearchParams(window.location.search).get("role")
    if (paramsRole === "buyer" || paramsRole === "seller") {
      setRoleState(paramsRole)
      return
    }
    fetch("/api/auth/user")
      .then((res) => res.json())
      .then((data) => {
        if (data.user?.role === "seller") {
          setRoleState("seller")
        } else {
          setRoleState("buyer")
        }
      })
      .catch(() => {
        setRoleState("buyer")
      })
  }, [])

  const setRole = React.useCallback((newRole: UserRole) => {
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
