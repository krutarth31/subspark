"use client"

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import { DataTable } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { getColumns, SubscriptionProduct, Role } from './columns'

export default function SubscriptionsPage() {
  const [products, setProducts] = useState<SubscriptionProduct[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [guildId, setGuildId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
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
        const list: SubscriptionProduct[] = []
        if (Array.isArray(productsData.products)) {
          for (const p of productsData.products) {
            if (p.type !== 'discord') continue
            const subs: {
              name?: string
              billing: string
              price?: number
              currency: string
              period?: string
              roleId?: string
            }[] =
              Array.isArray(p.subProducts) && p.subProducts.length > 0
                ? p.subProducts
                : [
                    {
                      billing: p.billing,
                      price: p.price,
                      currency: p.currency,
                      period: p.period,
                      roleId: p.roleId,
                      name: p.name,
                    },
                  ]
            subs.forEach((s, idx) => {
              if (s.billing === 'recurring' || s.billing === 'one') {
                list.push({
                  _id: p._id,
                  index: idx,
                  name: s.name ? `${p.name} - ${s.name}` : p.name,
                  price: s.price ?? p.price,
                  currency: s.currency || p.currency,
                  period: s.billing === 'recurring' ? s.period : undefined,
                  roleId: s.roleId,
                })
              }
            })
          }
        }
        setProducts(list)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function updateRole(id: string, index: number, roleId: string) {
    if (!guildId) return
    setSavingId(`${id}-${index}`)
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId, serverId: guildId, subIndex: index }),
      })
      if (!res.ok) throw new Error('Request failed')
      toast.success('Role updated')
      setProducts((prev) =>
        prev.map((p) =>
          p._id === id && p.index === index
            ? { ...p, roleId: roleId || undefined }
            : p
        )
      )
    } catch {
      toast.error('Failed to update')
    } finally {
      setSavingId(null)
    }
  }

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  )

  const columns = getColumns(roles, updateRole, savingId)

  return (
    <DashboardLayout title="Subscriptions">
      <div className="p-4 space-y-4">
        <Input
          placeholder="Search subscriptions..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {loading ? (
          <div className="flex justify-center p-6">
            <Spinner className="size-6" />
          </div>
        ) : filtered.length === 0 ? (
          <p>No products found.</p>
        ) : (
          <DataTable columns={columns} data={filtered} />
        )}
      </div>
    </DashboardLayout>
  )
}
