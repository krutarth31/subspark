"use client"

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import { Input } from '@/components/ui/input'
import dynamic from 'next/dynamic'

const DataTable = dynamic(() => import('@/components/ui/data-table'), {
  ssr: false,
  loading: () => <p>Loading table...</p>,
})
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import Link from 'next/link'
import { getColumns, Product } from './columns'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [archivingId, setArchivingId] = useState<string | null>(null)

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

  function archiveProduct(id: string) {
    if (archivingId) return
    setArchivingId(id)
    fetch(`/api/products/${id}`, { method: 'DELETE' })
      .then(() => {
        setProducts((prev) => prev.filter((p) => p._id !== id))
      })
      .finally(() => setArchivingId(null))
  }

  if (loading)
    return (
      <DashboardLayout title="Products">
        <div className="flex flex-1 items-center justify-center p-6">
          <Spinner className="size-6" />
        </div>
      </DashboardLayout>
    )

  return (
    <DashboardLayout title="Products">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button asChild>
            <Link href="/products/new">Add Product</Link>
          </Button>
        </div>
        {filtered.length === 0 ? (
          <p>No products found.</p>
        ) : (
          <DataTable
            columns={getColumns(archiveProduct, archivingId)}
            data={filtered}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
