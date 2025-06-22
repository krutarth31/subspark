"use client"

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import { DataTable } from '@/components/ui/data-table'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { getColumns, SubscriptionProduct, Role } from './columns'

interface Coupon {
  _id: string
  code: string
  percentOff: number
  active: boolean
}

export default function SubscriptionsPage() {
  const [products, setProducts] = useState<SubscriptionProduct[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [guildId, setGuildId] = useState<string | null>(null)
  const [guildName, setGuildName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [couponCode, setCouponCode] = useState('')
  const [couponPercent, setCouponPercent] = useState('10')
  const [creating, setCreating] = useState(false)

  const help = (
    <p>Assign Discord roles to each subscription product on this page.</p>
  )

  useEffect(() => {
    async function load() {
      try {
        const [rolesRes, productsRes, statusRes, couponsRes] = await Promise.all([
          fetch('/api/discord/roles'),
          fetch('/api/products'),
          fetch('/api/discord/status'),
          fetch('/api/coupons'),
        ])
        const rolesData = await rolesRes.json().catch(() => ({}))
        const productsData = await productsRes.json().catch(() => ({}))
        const statusData = await statusRes.json().catch(() => ({}))
        const couponsData = await couponsRes.json().catch(() => ({}))
        setRoles(rolesData.roles || [])
        setGuildId(statusData.guildId || null)
        setGuildName(statusData.guildName || null)
        setCoupons(Array.isArray(couponsData.coupons) ? couponsData.coupons : [])
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
    await toast.promise(
      (async () => {
        const res = await fetch(`/api/products/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roleId, serverId: guildId, subIndex: index }),
        })
        if (!res.ok) throw new Error('Request failed')
        setProducts((prev) =>
          prev.map((p) =>
            p._id === id && p.index === index
              ? { ...p, roleId: roleId || undefined }
              : p
          )
        )
      })(),
      {
        loading: 'Saving...',
        success: 'Role updated',
        error: 'Failed to update',
      }
    )
    setSavingId(null)
  }

  async function createCoupon() {
    if (creating) return
    setCreating(true)
    const res = await fetch('/api/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: couponCode, percentOff: Number(couponPercent) })
    })
    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      setCoupons((prev) => [...prev, { _id: data.id, code: couponCode, percentOff: Number(couponPercent), active: true }])
      setCouponCode('')
      setCouponPercent('10')
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Failed to create')
    }
    setCreating(false)
  }

  const columns = getColumns(roles, updateRole, savingId)

  return (
    <DashboardLayout title="Subscriptions" helpContent={help}>
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center p-6">
            <Spinner className="size-6" />
          </div>
        ) : products.length === 0 ? (
          <p>No products found.</p>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">
              Discord Guild: {guildName || guildId || 'Not connected'}
            </div>
            <DataTable columns={columns} data={products} />
            <div className="mt-8 space-y-4">
              <h2 className="text-lg font-semibold">Coupons</h2>
              <div className="max-w-sm space-y-2">
                <Label htmlFor="coupon-code">Code</Label>
                <Input id="coupon-code" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
                <Label htmlFor="coupon-percent" className="mt-2">Percent Off</Label>
                <Input id="coupon-percent" value={couponPercent} onChange={(e) => setCouponPercent(e.target.value.replace(/[^0-9]/g, ''))} />
                <Button className="mt-2" onClick={createCoupon} disabled={creating}>
                  {creating && <Spinner className="mr-2" />}Create Coupon
                </Button>
              </div>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="px-2 py-1">Code</th>
                    <th className="px-2 py-1">Percent Off</th>
                    <th className="px-2 py-1">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c._id} className="border-t">
                      <td className="px-2 py-1 font-mono">{c.code}</td>
                      <td className="px-2 py-1">{c.percentOff}%</td>
                      <td className="px-2 py-1">{c.active ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                  {coupons.length === 0 && (
                    <tr>
                      <td className="px-2 py-4 text-center" colSpan={3}>No coupons yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
