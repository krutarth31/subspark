"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

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
  deliveryFile?: string
  serverId?: string
  roleId?: string
  licenseKeys?: string
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
  const [autoExpire, setAutoExpire] = useState(false)
  const [availableUnits, setAvailableUnits] = useState('')
  const [unlimited, setUnlimited] = useState(false)
  const [expireDays, setExpireDays] = useState('')
  const [deliveryFile, setDeliveryFile] = useState('')
  const [serverId, setServerId] = useState('')
  const [roleId, setRoleId] = useState('')
  const [licenseKeys, setLicenseKeys] = useState('')
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
          setAutoExpire(!!data.product.expireDays)
          setExpireDays(data.product.expireDays ? String(data.product.expireDays) : '')
          setDeliveryFile(data.product.deliveryFile || '')
          setServerId(data.product.serverId || '')
          setRoleId(data.product.roleId || '')
          setLicenseKeys(data.product.licenseKeys || '')
          setPeriod(data.product.period || 'month')
          setType(data.product.type)
          setStatus(data.product.status)
        }
      })
      .catch(() => setError('Failed to load product'))
  }, [params.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const priceNumber = billing === 'free' ? 0 : parseFloat(price)
    if (isNaN(priceNumber)) {
      setError('Invalid price')
      return
    }
    let res: Response
    try {
      res = await fetch(`/api/products/${params.id}`, {
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
          expireDays: autoExpire && expireDays ? parseInt(expireDays) : null,
          deliveryFile,
          serverId,
          roleId,
          licenseKeys,
          description,
          type,
          status,
        }),
      })
    } catch {
      setError('Network error')
      return
    }
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
          <Select value={billing} onValueChange={(v) => setBilling(v as 'free' | 'one' | 'recurring')}>
            <SelectTrigger id="billing" className="w-full">
              <SelectValue placeholder="Select billing" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="one">One time</SelectItem>
              <SelectItem value="recurring">Recurring</SelectItem>
            </SelectContent>
          </Select>
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
              <Checkbox
                checked={unlimited}
                onCheckedChange={(v) => setUnlimited(!!v)}
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
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={autoExpire}
                  onCheckedChange={(v) => setAutoExpire(!!v)}
                />
                Auto expire access
              </label>
              {autoExpire && (
                <Input
                  id="expire"
                  value={expireDays}
                  onChange={(e) => setExpireDays(e.target.value)}
                  placeholder="Days"
                />
              )}
            </div>
          </>
        )}
        {billing === 'recurring' && (
          <div className="space-y-2">
            <Label htmlFor="period">Subscription period</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger id="period" className="w-full">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="year">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {type === 'file' && (
          <div className="space-y-2">
            <Label htmlFor="deliveryFile">File name</Label>
            <Input id="deliveryFile" value={deliveryFile} onChange={(e) => setDeliveryFile(e.target.value)} />
          </div>
        )}
        {type === 'discord' && (
          <div className="space-y-2">
            <Label htmlFor="serverId">Server ID</Label>
            <Input id="serverId" value={serverId} onChange={(e) => setServerId(e.target.value)} />
            <Label htmlFor="roleId">Role ID</Label>
            <Input id="roleId" value={roleId} onChange={(e) => setRoleId(e.target.value)} />
          </div>
        )}
        {type === 'key' && (
          <div className="space-y-2">
            <Label htmlFor="licenseKeys">License Keys</Label>
            <textarea
              id="licenseKeys"
              className="min-h-[100px] w-full rounded border px-2 py-1"
              value={licenseKeys}
              onChange={(e) => setLicenseKeys(e.target.value)}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as 'discord' | 'file' | 'key')}>
            <SelectTrigger id="type" className="w-full">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="discord">Discord</SelectItem>
              <SelectItem value="file">File</SelectItem>
              <SelectItem value="key">Key</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as 'draft' | 'published')}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit">Save</Button>
      </form>
    </DashboardLayout>
  )
}
