"use client"
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import { Spinner } from '@/components/ui/spinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface Role {
  id: string
  name: string
}

interface Product {
  _id: string
  name: string
  roleId?: string
  billing: string
  type: string
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[] | null>(null)
  const [products, setProducts] = useState<Product[] | null>(null)
  const [guildId, setGuildId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [rolesRes, productsRes, statusRes] = await Promise.all([
          fetch('/api/discord/roles'),
          fetch('/api/products'),
          fetch('/api/discord/status'),
        ])
        const rolesData = await rolesRes.json().catch(() => ({}))
        const productsData = await productsRes.json().catch(() => ({}))
        const statusData = await statusRes.json().catch(() => ({}))
        setRoles(rolesData.roles || [])
        setGuildId(statusData.guildId || null)
        const list = Array.isArray(productsData.products)
          ? productsData.products.filter(
              (p: Product) => p.billing === 'recurring' && p.type === 'discord'
            )
          : []
        setProducts(list)
      } catch {
        setRoles([])
        setProducts([])
      }
    }
    load()
  }, [])

  async function updateRole(id: string, roleId: string) {
    if (!guildId) return
    setSavingId(id)
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId, serverId: guildId }),
      })
      if (!res.ok) throw new Error('Request failed')
      toast.success('Role updated')
      setProducts(prev =>
        prev?.map(p =>
          p._id === id ? { ...p, roleId: roleId || undefined } : p
        ) || null
      )
    } catch {
      toast.error('Failed to update')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <DashboardLayout title="Manage Roles">
      <div className="flex flex-1 flex-col items-center p-6">
        {roles === null || products === null ? (
          <Spinner className="size-6" />
        ) : products.length === 0 ? (
          <p>No subscriptions found.</p>
        ) : (
          <div className="w-full max-w-md space-y-2">
            {products.map((prod) => (
              <div
                key={prod._id}
                className="flex items-center justify-between rounded border px-2 py-1"
              >
                <span>{prod.name}</span>
                <Select
                  value={prod.roleId || 'none'}
                  onValueChange={(v) =>
                    updateRole(prod._id, v === 'none' ? '' : v)
                  }
                  disabled={savingId === prod._id}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
