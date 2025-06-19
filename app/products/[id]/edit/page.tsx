"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Product {
  name: string
  price: number
  currency: string
  billing: 'free' | 'one' | 'recurring'
  description?: string
  planDescription?: string
  availableUnits?: number
  unlimited?: boolean
  expireDays?: number
  period?: string
  type: 'discord' | 'file' | 'key'
  status: 'draft' | 'published'
}

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [billing, setBilling] = useState<'free' | 'one' | 'recurring'>('one')
  const [description, setDescription] = useState('')
  const [planDescription, setPlanDescription] = useState('')
  const [availableUnits, setAvailableUnits] = useState('')
  const [unlimited, setUnlimited] = useState(false)
  const [expireDays, setExpireDays] = useState('')
  const [period, setPeriod] = useState('month')
  const [type, setType] = useState<'discord' | 'file' | 'key'>('discord')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/products/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.product) {
          setProduct(data.product)
          setName(data.product.name)
          setPrice(String(data.product.price))
          setCurrency(data.product.currency || 'USD')
          setBilling(data.product.billing)
          setDescription(data.product.description || '')
          setPlanDescription(data.product.planDescription || '')
          setAvailableUnits(data.product.availableUnits ? String(data.product.availableUnits) : '')
          setUnlimited(Boolean(data.product.unlimited))
          setExpireDays(data.product.expireDays ? String(data.product.expireDays) : '')
          setPeriod(data.product.period || 'month')
          setType(data.product.type)
          setStatus(data.product.status)
        }
      })
  }, [params.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const priceNumber = billing === 'free' ? 0 : parseFloat(price)
    if (isNaN(priceNumber)) {
      setError('Invalid price')
      return
    }
    const res = await fetch(`/api/products/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        price: priceNumber,
        currency,
        billing,
        period: billing === 'recurring' ? period : undefined,
        planDescription,
        availableUnits: unlimited ? null : availableUnits ? parseInt(availableUnits) : null,
        unlimited,
        expireDays: expireDays ? parseInt(expireDays) : null,
        description,
        type,
        status,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Update failed')
      return
    }
    router.push('/products')
  }

  if (!product) return <DashboardLayout title="Edit Product">Loading...</DashboardLayout>

  return (
    <DashboardLayout title="Edit Product">
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billing">Billing</Label>
          <select
            id="billing"
            className="w-full rounded border px-2 py-1 text-sm"
            value={billing}
            onChange={(e) => setBilling(e.target.value as 'free' | 'one' | 'recurring')}
          >
            <option value="free">Free</option>
            <option value="one">One time</option>
            <option value="recurring">Recurring</option>
          </select>
        </div>
        {billing !== 'free' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input id="price" value={price} onChange={(e) => setPrice(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="available">Available units</Label>
          <div className="flex items-center gap-2">
            <Input
              id="available"
              value={availableUnits}
              onChange={(e) => setAvailableUnits(e.target.value)}
              disabled={unlimited}
            />
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={unlimited}
                onChange={(e) => setUnlimited(e.target.checked)}
              />
              Unlimited
            </label>
          </div>
        </div>
        {billing !== 'recurring' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="planDesc">Plan description</Label>
              <textarea
                id="planDesc"
                className="min-h-[60px] w-full rounded border px-2 py-1"
                value={planDescription}
                onChange={(e) => setPlanDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expire">Auto expire access (days)</Label>
              <Input
                id="expire"
                value={expireDays}
                onChange={(e) => setExpireDays(e.target.value)}
              />
            </div>
          </>
        )}
        {billing === 'recurring' && (
          <div className="space-y-2">
            <Label htmlFor="period">Subscription period</Label>
            <select
              id="period"
              className="w-full rounded border px-2 py-1 text-sm"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            className="w-full rounded border px-2 py-1 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as 'discord' | 'file' | 'key')}
          >
            <option value="discord">Discord</option>
            <option value="file">File</option>
            <option value="key">Key</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            className="w-full rounded border px-2 py-1 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit">Save</Button>
      </form>
    </DashboardLayout>
  )
}
