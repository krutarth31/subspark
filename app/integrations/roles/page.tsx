"use client"
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import { Spinner } from '@/components/ui/spinner'

interface Role {
  id: string
  name: string
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[] | null>(null)

  useEffect(() => {
    fetch('/api/discord/roles')
      .then(res => res.json())
      .then(data => setRoles(data.roles || []))
      .catch(() => setRoles([]))
  }, [])

  return (
    <DashboardLayout title="Manage Roles">
      <div className="flex flex-1 flex-col items-center p-6">
        {roles === null ? (
          <Spinner className="size-6" />
        ) : roles.length === 0 ? (
          <p>No roles found.</p>
        ) : (
          <div className="w-full max-w-md space-y-2">
            {roles.map(role => (
              <div key={role.id} className="flex items-center justify-between rounded border px-2 py-1">
                <span>{role.name}</span>
                <code className="text-muted-foreground text-xs">{role.id}</code>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
