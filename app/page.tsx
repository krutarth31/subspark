"use client"

import { LoginForm } from "@/components/login-form"
import { HelpButton } from "@/components/help-button"
import { useSearchParams } from "next/navigation"

export default function Home() {
  const params = useSearchParams()
  const redirect = params.get("redirect") || "/dashboard"
  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative">
      <div className="absolute right-2 top-2">
        <HelpButton content={<p>Login with your credentials to access the dashboard.</p>} />
      </div>
      <LoginForm redirect={redirect} />
    </div>
  )
}
