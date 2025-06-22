"use client"

import { useState } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useRouter } from 'next/navigation'

export default function NewCouponPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [percent, setPercent] = useState('10')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createCoupon() {
    if (loading) return
    setLoading(true)
    setError(null)
    const res = await fetch('/api/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, percentOff: Number(percent) })
    })
    if (res.ok) {
      router.push('/coupons')
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to create')
      setLoading(false)
    }
  }

  const help = <p>Create a new coupon code for your store.</p>

  return (
    <DashboardLayout title="New Coupon" helpContent={help}>
      <div className="p-4 space-y-2 max-w-sm">
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Label htmlFor="code">Code</Label>
        <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} />
        <Label htmlFor="percent" className="mt-2">Percent Off</Label>
        <Input
          id="percent"
          value={percent}
          onChange={(e) => setPercent(e.target.value.replace(/[^0-9]/g, ''))}
        />
        <Button className="mt-4" onClick={createCoupon} disabled={loading}>
          {loading && <Spinner className="mr-2" />}Create Coupon
        </Button>
      </div>
    </DashboardLayout>
  )
}
