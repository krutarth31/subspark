"use client"

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Product {
  _id: string
  name: string
  price: number
  description?: string
  type: 'discord' | 'file' | 'key'
  status: 'draft' | 'published'
  createdAt: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  )

  async function archiveProduct(id: string) {
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    setProducts((prev) => prev.filter((p) => p._id !== id))
  }

  if (loading) return <DashboardLayout title="Products">Loading...</DashboardLayout>

  return (
    <DashboardLayout title="Products">
      <div className="p-4 space-y-4">
        <Input
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {filtered.length === 0 ? (
          <p>No products found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-1">Name</th>
                <th className="py-1">Price</th>
                <th className="py-1">Type</th>
                <th className="py-1">Status</th>
                <th className="py-1">Created</th>
                <th className="py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p._id} className="border-t">
                  <td className="py-1">{p.name}</td>
                  <td className="py-1">${p.price.toFixed(2)}</td>
                  <td className="py-1">{p.type}</td>
                  <td className="py-1">{p.status}</td>
                  <td className="py-1">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="py-1 flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <a href={`/products/${p._id}/edit`}>Edit</a>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => archiveProduct(p._id)}
                    >
                      Archive
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  )
}
