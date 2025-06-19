"use client"

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import { Button } from '@/components/ui/button'

interface Product {
  _id: string
  name: string
  price: number
  description?: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <DashboardLayout title="Products">Loading...</DashboardLayout>

  return (
    <DashboardLayout title="Products">
      <div className="p-4 space-y-4">
        {products.length === 0 ? (
          <p>No products yet.</p>
        ) : (
          <ul className="space-y-2">
            {products.map((p) => (
              <li key={p._id} className="flex items-center gap-2">
                <span className="flex-1">{p.name}</span>
                <span>${p.price.toFixed(2)}</span>
                <Button asChild size="sm" variant="outline">
                  <a href={`/products/${p._id}/edit`}>Edit</a>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  )
}
