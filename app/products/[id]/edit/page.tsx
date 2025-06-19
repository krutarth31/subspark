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
  description?: string
  type: 'discord' | 'file' | 'key'
  status: 'draft' | 'published'
}

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
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
          setDescription(data.product.description || '')
          setType(data.product.type)
          setStatus(data.product.status)
        }
      })
  }, [params.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const priceNumber = parseFloat(price)
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
          <Label htmlFor="price">Price</Label>
          <Input id="price" value={price} onChange={(e) => setPrice(e.target.value)} required />
        </div>
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
