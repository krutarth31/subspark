"use client"

import { LoginForm } from "@/components/login-form"
import { HelpButton } from "@/components/help-button"

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative">
      <div className="absolute right-2 top-2">
        <HelpButton content={<p>Login with your credentials to access the dashboard.</p>} />
      </div>
      <LoginForm />
    </div>
  )
}
