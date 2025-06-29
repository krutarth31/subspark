"use client"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/dashboard-layout"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { apiFetch } from "@/lib/api-client"

interface User {
  name: string
  email: string
  avatar?: string
}

export default function Page() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    apiFetch("/api/auth/user")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user)
      })
      .catch(() => {})
  }, [])

  const help = <p>View your profile information on this page.</p>
  return (
    <DashboardLayout title="Account" helpContent={help}>
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        {user ? (
          <div className="space-y-4 text-center">
            <Avatar className="mx-auto h-16 w-16">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-lg font-semibold">{user.name}</p>
              <p className="text-muted-foreground text-sm">{user.email}</p>
            </div>
            <Button asChild className="mt-4">
              <Link href="/account/edit">Edit Account</Link>
            </Button>
          </div>
        ) : (
          <Spinner className="size-6" />
        )}
      </div>
    </DashboardLayout>
  )
}
